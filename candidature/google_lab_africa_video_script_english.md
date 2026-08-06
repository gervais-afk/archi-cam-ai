# Video Presentation Script: Archi Cam AI (2 Minutes)
**Target Audience:** Google Africa Applied AI Lab Jury & Venture Investors (Accra, 2026)  
**Tools of the Trade:** OBS Studio + CapCut Desktop + Google Vids  
**Tone:** Kinetic, highly authoritative, technical, and visionary.

---

## 🛠️ High-Impact Production Settings Checklist

### 📽️ OBS Studio (Source Capture)
*   **Resolution & Framerate:** 1080p or 4K at 60 FPS (critical to demonstrate smooth WebGL orbital rotations without lag).
*   **Presenter Integration:** Circle webcam mask in the bottom-right corner, clean professional dress, warm face-focused lighting.

### 🎬 CapCut Desktop (Motion Design & Pacing)
*   **Dynamic Auto-Captions:** Apply bold modern fonts. Automatically highlight key technical metrics in **Google Blue** (`#4285F4`) or **Neon Yellow** (`#F4B400`).
*   **Keyframe Camera Zooms:** 
    *   *Smooth Zoom* to the python console executing `scripts/fast_extract_quantities.py` showing the **0.004s** execution speed.
    *   *Scale 130%* on the `FileValidator` logs checking for Magic Bytes signatures.
*   **Sound Design (SFX):** Subtly insert digital interface clicks, data-processing static hums, and sweeping "Whoosh" sounds during slide-to-demo transitions.
*   **Tech Background Score:** Deep, rhythmic synth-wave electronic track set at `-25 dB` (escalating to `-15 dB` for the final 10 seconds).

---

## ⏱️ Interactive Video Script Timeline

| Time | Segment | Visual (Screencast / Webcam) | Audio / Voiceover Narration | Editing & SFX Instructions |
| :--- | :--- | :--- | :--- | :--- |
| **00:00 - 00:15** | **The Hook** | **Visual:** Presenter on webcam. Behind them, a fast-paced split screen of paper sketches, CAD file folders, and a large, complex Excel sheet. <br><br>**Action:** Presenter holds up a hand-drawn sketch and selects a Revit file, drag-and-dropping them onto the dashboard. | "In Africa, estimating structural quantities for a single project takes an average of **seven days**, with **twenty-five percent error rates** that bleed construction budgets. <br><br>I built **Archi Cam AI**—transforming any 3D CAD model, 2D PDF, or paper sketch into a bankable, multi-tab Excel devis in **forty-five seconds**." | *SFX:* Deep, dramatic sub-bass drop. <br><br>*CapCut:* Kinetic text animations of "**7 Days**" changing to "**45 Seconds**". |
| **00:15 - 00:40** | **Validation, Cache & Smart Routing** | **Visual:** Screen transitions to `http://localhost:3002`. User uploads a Revit `.rvt` file. The interface instantly logs: `FileValidator: Revit magic bytes verified`, then `ConversionCache: HIT`. | "First, our **pre-flight validator** inspects binary magic bytes signatures to block corrupt uploads in milliseconds. <br><br>Our **conversion cache** checks the file's SHA-256 hash. If it matches a previous upload, it retrieves the cached IFC instantly, saving **sixty seconds** and **five FCFA** of API credits. <br><br>Finally, our **smart router** automatically directs native IFCs, proprietary CAD formats, and 2D plans into their optimal processing lanes." | *SFX:* Digital "Whoosh" and high-tech processing clicks. <br><br>*CapCut:* Highlight "**CACHE HIT**" in neon green. Zoom on the smart routing animation. |
| **00:40 - 01:10** | **0.004s Fast Python Extraction** | **Visual:** Screen highlights the execution of `scripts/fast_extract_quantities.py`. The console output prints: `Extracted slab, wall, beam, column metadata in 0.004s`. | "For CAD models, we developed a fast Python parser. <br><br>Instead of launching heavy 3D shape rendering engines like Open CASCADE, which crash servers under high load, our extractor queries the metadata **Property Sets** directly in **point-zero-zero-four seconds**.<br><br>If properties are missing, it applies smart structural fallback dimensions automatically." | *CapCut:* Zoom in on the terminal output showing `0.004s` execution time. Highlight "**0.004s**" in yellow. |
| **01:10 - 01:40** | **Audits & Bankable Excel DQE** | **Visual:** The UI displays `@agent-structure` auditing beams against **BAEL 91** and `@agent-legal` checking municipal zoning laws. <br><br>Presenter clicks "Download BOQ". A beautifully formatted Excel workbook pops up. | "For safety, Archi Cam AI audits concrete volumes and steel reinforcements against **BAEL ninety-one** and local municipal zoning laws. <br><br>It maps quantities against our **MINMAP twenty-six** mercuriale database, delivering a signed, certified PDF and a fully formula-active, multi-tab **Excel DQE** ready for bank tenders." | *CapCut:* Show the transition of a raw model to a detailed, priced Excel spreadsheet with active formulas. <br><br>*SFX:* Typing sounds and soft mechanical "success" chimes. |
| **01:40 - 02:00** | **Sovereign Vision & Outro** | **Visual:** Presenter in webcam circle. Slide displays: `Archi Cam AI: Building a Sovereign, Precise Africa`. <br><br>Accra Lab 2026 logo. Web Link: `https://github.com/gervais-afk/archi-cam-ai.git`. | "I am merging open BIM with applied AI, validating this stack on **four hundred real African construction projects**. My roadmap is to port our reasoning engines onto offline **Google Gemma edge servers** for total African tech sovereignty.<br><br>I am dedicating my research at the University of Ngaoundéré to this vision. Thank you so much." | *SFX:* Theme music swells to full volume, ending on a crisp electronic beat. <br><br>*CapCut:* Fade-out to electric-blue glowing logo over a dark background. |

---

## 💡 Pitching Masterclass: Jury Hook & Energy
1. **Highlight the Numbers:** Speak technical metrics with punchy, deliberate pauses. Do not say "R-squared point ninety-eight", say "**R-squared of point-nine-eight-seven-two**" — it sounds rigorous, scientific, and precise.
2. **The Sovereign Roadmap:** Position the offline local Gemma Edge server as the future milestone. This is your "Ask" to Google—to help you deploy these secure local nodes on-site across Sub-Saharan Africa.
3. **Pacing:** Emphasize how the **0.004s Python extractor** solves server crash issues during big file uploads, showing true engineering optimization.
