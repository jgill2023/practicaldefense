# About Us Page Redesign

## Goal

Redesign the About Us page to equally feature three instructors (Jeremy Gill, Andy Montoya, Scott Teare) and convey authority, professionalism, and top-tier reputation implicitly through design quality, data, and credential presentation — without making explicit claims.

## Design Approach: The Dossier

Full-width alternating instructor sections give each person equal real estate and presence. Authority is communicated through a stats bar (numbers speak), credential logos (visual trust signals), and design restraint (no superlatives, no pressure language).

## Page Structure

### Section 1: Hero

- Full-width hero with existing group photo (`Instructors_1767335152648.jpg`)
- Dark gradient overlay matching site theme
- Grayscale-on-scroll effect (existing pattern)
- Title: "OUR TEAM" — uppercase Oswald
- Subtitle: "Professional firearms training in Albuquerque, New Mexico." — Inter, muted

### Section 2: Stats Bar

Horizontal strip, dark background with subtle teal (`#004149`) bottom border.

Four metrics displayed with large Oswald numbers (48-64px) and small Inter labels:

| Metric | Label |
|--------|-------|
| XX+ | YEARS EXPERIENCE |
| X,XXX+ | STUDENTS TRAINED |
| 5.0 ★ | GOOGLE RATING |
| XX+ | CERTIFICATIONS HELD |

Values are placeholder — owner to provide real numbers.

### Section 3: Instructor Dossiers

Three full-width sections, alternating photo placement. Alphabetical order.

**Layout per section (~40vh each):**
- Photo: ~40% width, placeholder dark gray with initials until real photos provided
- Content: ~60% width
  - Name: Large uppercase Oswald
  - Title: Inter, muted text color
  - Bio: 2-3 sentences (placeholder for Andy and Scott)
  - Credentials: Vertical list with teal bullet marks

**Ordering and alternation:**
1. **Jeremy Gill** — Photo left, content right. Title: "Founder & Lead Instructor"
2. **Andy Montoya** — Photo right, content left. Title: placeholder
3. **Scott Teare** — Photo left, content right. Title: placeholder

**Mobile:** All sections stack identically — photo on top, content below. No alternation.

**Separators:** Generous spacing or thin horizontal rules between sections.

### Section 4: Credential Logo Strip

Centered row of certification/affiliation logos below instructor sections:
- NRA
- Rangemaster
- NM DPS

Displayed in muted/grayscale treatment. Does not compete with content, adds visual credibility.

### Section 5: Mission Statement

Existing mission text (or refined version), centered, clean typography with breathing room.

Current text: "At Practical Defense Training, we are committed to providing professional, results-driven firearms training that empowers responsible citizens with the knowledge and skills necessary to protect themselves and their families. We believe in practical over 'tacti-cool' — focusing on what works in real-world defensive situations."

### Section 6: Closing CTA

Full-width section before footer. Dark background with subtle teal accent.

- Headline: "Ready to Train?" — Oswald, uppercase, large
- Subtext: "Browse our courses and find the right fit." — Inter, muted
- Button: "View Courses" — accent button style (gold `hsl(44, 89%, 61%)`), links to `/courses`

No urgency language. Clear next step.

## What's Deliberately Excluded

- No "Best in New Mexico" or "Top Rated" claims
- No "Book Now" CTAs interrupting instructor sections
- No company history timeline
- No competitor comparisons
- Google rating appears as a data point in stats bar, not a marketing callout

## Technical Notes

- Replace current `about.tsx` implementation
- Remove `about-chris.tsx` page
- Instructor data should be structured as an array for maintainability
- Reuse existing site components (Card, Button) and design tokens
- Maintain dark theme, Oswald/Inter typography, teal/gold accent colors
- Framer Motion for scroll-triggered section animations
- Responsive: alternating layout on desktop, stacked on mobile

## Files Affected

- `client/src/pages/about.tsx` — full rewrite
- `client/src/pages/about-chris.tsx` — delete
- Navigation/routing — remove about-chris route if referenced
