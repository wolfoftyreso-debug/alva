# Genererar referenssignaturer för KMS-anrop med botocore (AWS egen
# implementation). Kör: python3 kms-sigv4-referens.py > kms-sigv4-referens.json
#
# KMS använder SigV4 precis som S3 men är en JSON-POST: tjänsten är "kms",
# värden är kms.<region>.amazonaws.com, och X-Amz-Target styr operationen.
# Att vår signering ger EXAKT samma Authorization är den enda meningsfulla
# kontrollen — en signatur är antingen bitidentisk eller värdelös.
#
# Tiden fryses inte; vi läser tillbaka den X-Amz-Date botocore faktiskt
# signerade med, så referensen är intern konsistent oavsett när den körs.
import json
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

CRED = Credentials("AKIDEXAMPLE", "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY")

# (namn, target, kropp-dict, region)
FALL = [
    ("Encrypt", "TrentService.Encrypt",
     {"KeyId": "alias/alva-subjekt", "Plaintext": "aGVtbGlndA==",
      "EncryptionContext": {"subjekt": "arende-1"}}, "eu-north-1"),
    ("Decrypt", "TrentService.Decrypt",
     {"CiphertextBlob": "Y2lwaGVy", "EncryptionContext": {"subjekt": "arende-1"}},
     "eu-north-1"),
    ("ScheduleKeyDeletion", "TrentService.ScheduleKeyDeletion",
     {"KeyId": "alias/alva-subjekt", "PendingWindowInDays": 7}, "eu-west-1"),
]

ut = []
for namn, target, kropp, region in FALL:
    body = json.dumps(kropp, separators=(",", ":"))
    url = f"https://kms.{region}.amazonaws.com/"
    req = AWSRequest(method="POST", url=url, data=body.encode("utf-8"),
                     headers={"Content-Type": "application/x-amz-json-1.1",
                              "X-Amz-Target": target})
    SigV4Auth(CRED, "kms", region).add_auth(req)
    ut.append({
        "namn": namn,
        "target": target,
        "kropp_json": body,
        "region": region,
        "tid": req.headers["X-Amz-Date"],
        "authorization": req.headers["Authorization"],
    })

print(json.dumps(ut, indent=2, ensure_ascii=False))
