# Module: Communication model (voice)

> Canonical version. Swedish: [communication-model.sv.md](communication-model.sv.md).

## Core principle

**The user speaks, the system writes.**

The system uses voice-to-text for all spoken input. The technician should never
have to type on a keyboard while work is in progress.

No voice agent: the system does not hold a running spoken conversation, does not
read long answers aloud, and does not try to imitate a human conversation. The
communication is **speech in, text out**.

## Important design principle

> All voice is treated as an input method, not as a separate interface.

All logic in the system is built on text. Voice-to-text is only a way of
producing that text. That makes the solution easier to maintain, easier to
search, easier to export, and easier to develop further with new models in the
future.

## Workflow

1. The technician presses the microphone: *"I've measured between pin 14 and
   ground. I get 12.4 volts."*
2. Voice-to-text transcribes the speech.
3. The transcribed text is sent to the model as an ordinary text request.
4. The answer always comes back in writing: *Verified: supply voltage present at
   pin 14. Next step: check the ground connection at pin 7.*

## Why this choice?

- it works better in noisy workshops,
- it produces a permanent text log with no extra step,
- it makes the history easy to search,
- it reduces the risk of misunderstanding compared with a continuous spoken
  conversation,
- it suits cases where several technicians work on the same job.

## Push-to-talk (PTT)

Voice input works on a push-to-talk basis. The app listens **only** while the
user actively holds the microphone button, or after they have started an
explicit recording. No background listening. No automatic activation.

### Flow

1. The user holds down the microphone button (or presses a clear "Record"
   button, depending on the platform).
2. Recording starts immediately.
3. The app shows clearly that recording is in progress: a red indicator, a
   timer, a level meter, and the text "Recording".
4. The speech is transcribed in real time — the user watches the text appear and
   gets immediate feedback on whether the speech was understood correctly.
5. When the recording ends, the transcribed text is shown in an **editable**
   text field.
6. The user can accept, edit or re-record.
7. **Only when the user confirms** is the text sent onward and saved to the work
   log.

### Editing before sending

The transcription is always editable. Common corrections: registration numbers,
serial numbers, component designations, personal names, technical terms.

**"Send" never happens automatically.** The technician always gets a quick
chance to correct the transcription before it becomes part of the permanent work
log. That reduces the risk of incorrect registration numbers, component
designations and measured values.

### No hidden functionality

The user must always be able to see:

- when recording is in progress,
- when it has ended,
- what will be sent,
- what has actually been saved.

There must never be any doubt about when audio is being recorded or when
information is being sent.

## Automatic record keeping

Every transcribed sentence automatically becomes part of the work log:

```
08:14  "Measured voltage between pin 14 and ground. 12.4 volts."
08:14  System: Supply voltage verified.
08:15  "Relay doesn't click."
08:15  System: Check the control signal to the relay.
```

Everything is saved without the technician having to type a single line.

## Hands-free working

The app is optimised for busy or dirty hands. During a normal case the user
should be able to identify the object with the camera, photograph components,
dictate observations, be shown the next step and carry on working — without
typing manually. The interface has to work with gloves, dirty hands, strong
sunlight, noise and vibration; the microphone button is large, easy to hit and
gives clear visual feedback.
