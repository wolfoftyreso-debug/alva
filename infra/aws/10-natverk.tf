# Nätet.
#
# Tre lager subnät per zon:
#   publikt   bara lastbalanserare och NAT-gateway
#   privat    noderna — inga publika IP-adresser
#   data      Aurora, helt utan väg ut
#
# Databasen får ett eget lager i stället för att dela nodernas subnät.
# Det gör "vem kan nå databasen" till en fråga om routing och inte bara
# om säkerhetsgrupper — två oberoende spärrar i stället för en.

locals {
  namn = "felsokning-${var.miljo}"

  taggar = {
    Projekt   = "guidad-felsokning"
    Miljo     = var.miljo
    Forvaltas = "terraform"
  }

  zoner = slice(data.aws_availability_zones.tillgangliga.names, 0, var.antal_zoner)

  # /20 per subnät ur en /16: 4096 adresser, gott om plats för noder som
  # var och en tar ett hundratal ENI-adresser.
  publika_cidr = [for i in range(var.antal_zoner) : cidrsubnet(var.vpc_cidr, 4, i)]
  privata_cidr = [for i in range(var.antal_zoner) : cidrsubnet(var.vpc_cidr, 4, i + 4)]
  data_cidr    = [for i in range(var.antal_zoner) : cidrsubnet(var.vpc_cidr, 4, i + 8)]
}

data "aws_availability_zones" "tillgangliga" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

resource "aws_vpc" "denna" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # krävs av EKS och av VPC-endpoints

  tags = { Name = local.namn }
}

resource "aws_internet_gateway" "denna" {
  vpc_id = aws_vpc.denna.id

  tags = { Name = local.namn }
}

# ---- Subnät -------------------------------------------------------------

resource "aws_subnet" "publikt" {
  count = var.antal_zoner

  vpc_id                  = aws_vpc.denna.id
  cidr_block              = local.publika_cidr[count.index]
  availability_zone       = local.zoner[count.index]
  map_public_ip_on_launch = false # bara lastbalanserare här — de får sina egna

  tags = {
    Name = "${local.namn}-publikt-${local.zoner[count.index]}"
    # Taggarna är inte kosmetiska: lastbalanserar-kontrollern hittar
    # subnäten genom dem.
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "privat" {
  count = var.antal_zoner

  vpc_id            = aws_vpc.denna.id
  cidr_block        = local.privata_cidr[count.index]
  availability_zone = local.zoner[count.index]

  tags = {
    Name                              = "${local.namn}-privat-${local.zoner[count.index]}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "data" {
  count = var.antal_zoner

  vpc_id            = aws_vpc.denna.id
  cidr_block        = local.data_cidr[count.index]
  availability_zone = local.zoner[count.index]

  tags = { Name = "${local.namn}-data-${local.zoner[count.index]}" }
}

# ---- Utgående trafik ----------------------------------------------------

resource "aws_eip" "nat" {
  count = var.nat_per_zon ? var.antal_zoner : 1

  domain = "vpc"

  tags = { Name = "${local.namn}-nat-${count.index}" }

  depends_on = [aws_internet_gateway.denna]
}

resource "aws_nat_gateway" "denna" {
  count = var.nat_per_zon ? var.antal_zoner : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.publikt[count.index].id

  tags = { Name = "${local.namn}-${count.index}" }

  depends_on = [aws_internet_gateway.denna]
}

# ---- Routing ------------------------------------------------------------

resource "aws_route_table" "publikt" {
  vpc_id = aws_vpc.denna.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.denna.id
  }

  tags = { Name = "${local.namn}-publikt" }
}

resource "aws_route_table_association" "publikt" {
  count = var.antal_zoner

  subnet_id      = aws_subnet.publikt[count.index].id
  route_table_id = aws_route_table.publikt.id
}

resource "aws_route_table" "privat" {
  count = var.antal_zoner

  vpc_id = aws_vpc.denna.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.denna[var.nat_per_zon ? count.index : 0].id
  }

  tags = { Name = "${local.namn}-privat-${local.zoner[count.index]}" }
}

resource "aws_route_table_association" "privat" {
  count = var.antal_zoner

  subnet_id      = aws_subnet.privat[count.index].id
  route_table_id = aws_route_table.privat[count.index].id
}

# Datalagret har ingen väg ut. Aurora behöver ingen, och saknaden är
# skyddet: en komprometterad databas kan inte ringa hem.
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.denna.id

  tags = { Name = "${local.namn}-data" }
}

resource "aws_route_table_association" "data" {
  count = var.antal_zoner

  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

# ---- VPC-endpoints ------------------------------------------------------
#
# Trafik till AWS egna tjänster går inom nätet i stället för ut genom NAT.
# Två vinster som drar åt samma håll: bilder och loggar passerar aldrig
# internet, och NAT-notan sjunker rejält — bilddragningar dominerar annars.

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.denna.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(aws_route_table.privat[*].id, [aws_route_table.data.id])

  tags = { Name = "${local.namn}-s3" }
}

resource "aws_security_group" "endpoints" {
  name        = "${local.namn}-endpoints"
  description = "Interface-endpoints — tar emot HTTPS från noderna."
  vpc_id      = aws_vpc.denna.id

  ingress {
    description     = "HTTPS från noderna"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.noder.id]
  }

  tags = { Name = "${local.namn}-endpoints" }
}

resource "aws_vpc_endpoint" "granssnitt" {
  for_each = toset([
    "ecr.api",
    "ecr.dkr",
    "logs",
    "secretsmanager",
    "sts",
    "elasticloadbalancing",
  ])

  vpc_id              = aws_vpc.denna.id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.privat[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true

  tags = { Name = "${local.namn}-${replace(each.key, ".", "-")}" }
}

# ---- Flödesloggar -------------------------------------------------------
#
# Bara avvisad trafik. Allt hade blivit dyrt brus; avvisningarna är det
# som faktiskt säger något när en spärr slår till eller borde ha gjort det.

resource "aws_flow_log" "denna" {
  vpc_id                   = aws_vpc.denna.id
  traffic_type             = "REJECT"
  iam_role_arn             = aws_iam_role.flodeslogg.arn
  log_destination          = aws_cloudwatch_log_group.flodeslogg.arn
  max_aggregation_interval = 60

  tags = { Name = local.namn }
}

resource "aws_iam_role" "flodeslogg" {
  name = "${local.namn}-flodeslogg"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "flodeslogg" {
  name = "skriv-loggar"
  role = aws_iam_role.flodeslogg.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
      ]
      Resource = "${aws_cloudwatch_log_group.flodeslogg.arn}:*"
    }]
  })
}
