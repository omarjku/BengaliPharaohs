# Video script (target 4:00, allowed 2-5 min, brief order)

Honest numbers all come from `docs/results.md` and `docs/e2e-report.md`. Items marked [FILL] must be measured before recording. Speaker: Zoha (voice-over, "your take"), Omar (tech and numbers). Record 1080p, captions on, unlisted link tested in a private window, upload by Sun 13:00.

## 1. Problem sentence (0:00-0:25)
**Shot:** photo of a flooded Aman field (credited or our own), then title card with the sentence on screen.
> "Because of this tool, a smallholder rice farmer in a flood-hit Bangladeshi upazila will decide whether to wait, re-plant or switch to Boro within a day of the water going down, which he would otherwise decide late or by guesswork. We know because the August 2024 floods damaged about 200,000 hectares of Aman rice (USDA GAIN BG2024-0009), one agriculture officer serves roughly 900 to 2,000 families, and the 16123 helpline is closed on Fridays, Saturdays and holidays (ais.gov.bd)."

Check before recording: SAAO ratio year/source (docs flag "verify"), the 200,000 ha figure against the USDA GAIN page. If the ratio is unverified, say "one officer serves hundreds of families" or cut it.

## 2. AI capabilities, why not simpler, guardrails (0:25-1:05)
**Shot:** diagram (text version below), then bean leaf -> NOT SURE.
> "The AI does one thing: it looks at a rice leaf. A MobileNetV3-Small, 6.1 megabytes, runs inside the browser on the phone, no connection needed. We trained it on about 14,000 Bangladeshi field photos from four open datasets plus 747 non-rice leaves.
> Why not SMS, a spreadsheet or search? A farmer cannot type 'brown oval spots with grey centres' into an SMS, and a helpline is closed on Friday. The photo is the one place pattern recognition beats a lookup. The flood advice is deliberately not AI: it is a table of BRRI and DAE rules, each with source and year, so every answer comes from a fixed list and can be checked.
> Guardrails: it never shows certainty; below 80% confidence, or for anything that is not a rice leaf, it says 'not sure, ask your SAAO'; no pesticide names or doses; nothing leaves the phone unless the farmer taps share."

## 3. Demo, end to end (1:05-2:35)
Follow `DEMO.md` steps exactly. Screen-record the real phone, airplane-mode icon visible.
| Time | Shot | Voice-over |
|---|---|---|
| 1:05 | Phone, airplane mode, app opens | "Rahim, Sirajganj. No signal. The app is installed and everything runs on the phone." |
| 1:15 | `blast-1.jpg` -> result card, Listen plays Bangla | "Looks like blast, not certain, and it could be brown spot. What to do now, what not to do, who to ask." |
| 1:30 | `not_rice-1.jpg` -> NOT SURE | "A bean leaf it has never seen: not sure. 60 of 60 bean leaves got this answer." |
| 1:40 | `blb-1.jpg` -> two follow-up questions -> NOT SURE | "When the photo alone is unsure it asks Rahim two yes/no questions. Context can only choose between the top two guesses or decline." |
| 1:55 | Flood advisor, date label "simulated" | "After a flood: variety, days under water, growth stage. The date is simulated, because today is already past the Aman window. The rules come from BRRI, with source and year." |
| 2:10 | Share -> consent -> airplane off -> laptop SAAO dashboard | "He taps share, consents, and the case waits on the phone until there is signal. Then the officer sees it, with the facts first and the photo after." |
| 2:30 | Caption: "Seeded: other cases on the dashboard, SMS preview, area update" | "What is seeded is labelled on screen." |

## 4. Evidence (2:35-3:15)
**Shot:** results table from README, then the confusion note and "does not cover" list.
> "We tested on AgML-BD, 549 Bangladeshi field photos from a dataset the model never saw. When it answers, it is right 74% of the time, and it answers 63% of the time. On data like its training data it reaches 95%. That gap is the lab-to-field problem the literature reports, and we show it instead of hiding it.
> We also ran leave-one-dataset-out tests: when a whole dataset is held out, accuracy falls to 12 to 41% and tungro or bacterial leaf blight are almost never found, because most of their photos come from one source. So the photo is never the final word.
> The model is 6.1 megabytes and runs in 11 to 14 milliseconds on a laptop [FILL: and X ms on a Tk 6,000 Android]. What the data does not cover: flood-stress photos, planthopper, stem borer, panicle diseases, seedlings, Boro season, and districts outside our sources."

## 5. Where it sits in his day + tech stack (3:15-3:45)
**Shot:** day timeline graphic (morning walk the bund, photo at the field, evening Wi-Fi/3G sync) and stack diagram.
> "He checks a leaf on the walk to the field, gets an answer in under a second, and if the app is unsure it goes to the officer when signal returns. After a flood he uses the advisor before deciding whether to re-plant. Stack: Next.js PWA with a service worker for offline, onnxruntime-web, IndexedDB queue, FastAPI and SQLite on Railway for the SAAO dashboard. No LLM in the farmer's path."

## 6. Your take: what localizing AI means (3:45-4:15) (Zoha, personal)
> Draft: "For us localizing AI means three things. It is tested on photos from Bangladeshi fields, not borrowed numbers. It speaks Bangla by voice and in the farmer's own words. And it admits what it does not know and sends him to a person who does. Even so, Bangla-only still leaves Chakma and Marma speakers behind." Zoha: rewrite in your own words.

## Close (4:15-4:25)
End card: name, team, live URL, repo.

## Diagram text (for the slide)
```
Photo --> [phone: MobileNetV3-Small ONNX, WASM] --> class + confidence
                                  |                       |
                    farmer taps (variety, stage, days)    |
                                  v                       v
                    [fixed rules: BRRI/DAE, 16 cards] -> keep / swap / NOT SURE
                                  |
                       Bangla card + audio -> "Share with SAAO?" (consent)
                                  |  (store-and-forward, facts first)
                                  v
                       [FastAPI + SQLite] -> SAAO dashboard -> human reply
```
