# About Us Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the About Us page as a dossier-style layout with three equal instructor sections, a stats bar, credential logos, mission statement, and closing CTA — conveying authority implicitly through design quality and data.

**Architecture:** Single-page rewrite of `about.tsx`. Instructor data stored as a typed array at the top of the file. Sections render sequentially: hero, stats bar, 3 alternating instructor dossiers, credential logo strip, mission statement, CTA. Framer Motion for scroll-triggered fade-in animations. Fully responsive.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide icons, wouter (Link), existing shadcn/ui Button component.

**Design doc:** `docs/plans/2026-02-21-about-page-redesign-design.md`

---

### Task 1: Rewrite about.tsx — Data model and Hero section

**Files:**
- Modify: `client/src/pages/about.tsx` (full rewrite)

**Step 1: Replace entire file with new data model, imports, and Hero section**

Replace the entire contents of `about.tsx` with:

```tsx
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import heroImage from "@assets/Instructors_1767335152648.jpg";
import { Award, Star, Users, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface InstructorData {
  id: string;
  name: string;
  initials: string;
  title: string;
  image: string | null;
  credentials: string[];
  bio: string;
}

const instructors: InstructorData[] = [
  {
    id: "jeremy-gill",
    name: "Jeremy Gill",
    initials: "JG",
    title: "Founder & Lead Instructor",
    image: null,
    credentials: [
      "NM DPS Certified Instructor #445",
      "NRA Certified Instructor",
      "Rangemaster Certified Instructor",
      "Dr. William Aprill's Unthinkable Attendee and Host",
      "Graduate of MAG-20",
    ],
    bio: "Jeremy founded Practical Defense Training with a mission to provide professional, results-driven firearms training that empowers responsible citizens with the knowledge and skills necessary to protect themselves and their families.",
  },
  {
    id: "andy-montoya",
    name: "Andy Montoya",
    initials: "AM",
    title: "Instructor",
    image: null,
    credentials: [
      "Credential placeholder",
    ],
    bio: "Bio placeholder — to be provided.",
  },
  {
    id: "scott-teare",
    name: "Scott Teare",
    initials: "ST",
    title: "Instructor",
    image: null,
    credentials: [
      "Credential placeholder",
    ],
    bio: "Bio placeholder — to be provided.",
  },
];

const stats = [
  { value: "XX+", label: "YEARS EXPERIENCE", icon: Award },
  { value: "X,XXX+", label: "STUDENTS TRAINED", icon: Users },
  { value: "5.0 ★", label: "GOOGLE RATING", icon: Star },
  { value: "XX+", label: "CERTIFICATIONS HELD", icon: ShieldCheck },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function About() {
  const [grayscaleAmount, setGrayscaleAmount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollProgress = Math.min(window.scrollY / 400, 1);
      setGrayscaleAmount(scrollProgress * 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Layout>
      <SEO
        title="Our Team"
        description="Meet the instructors behind Practical Defense Training. Certified, experienced firearms instructors providing professional training in Albuquerque, New Mexico."
      />

      {/* Hero Section */}
      <section className="relative h-[65vh] min-h-[500px] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
            filter: `grayscale(${grayscaleAmount}%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl uppercase tracking-widest text-white font-bold">
            Our Team
          </h1>
          <p className="text-white/80 text-lg mt-4 max-w-2xl">
            Professional firearms training in Albuquerque, New Mexico.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-card border-b-2 border-[#004149]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground tracking-wide">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground tracking-widest mt-2 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor Dossiers */}
      {instructors.map((instructor, index) => (
        <InstructorDossier
          key={instructor.id}
          instructor={instructor}
          reversed={index % 2 !== 0}
        />
      ))}

      {/* Credential Logo Strip */}
      <section className="bg-card py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16 opacity-50">
            <div className="text-center">
              <p className="font-heading text-sm uppercase tracking-widest text-muted-foreground">NRA Certified</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-sm uppercase tracking-widest text-muted-foreground">Rangemaster Certified</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-sm uppercase tracking-widest text-muted-foreground">NM DPS Certified</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <motion.section
        className="bg-background py-16 md:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-2xl md:text-3xl uppercase tracking-widest text-foreground mb-6">
            Our Mission
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            At Practical Defense Training, we are committed to providing professional, results-driven firearms training
            that empowers responsible citizens with the knowledge and skills necessary to protect themselves and their
            families. We believe in practical over "tacti-cool" — focusing on what works in real-world defensive
            situations.
          </p>
        </div>
      </motion.section>

      {/* Closing CTA */}
      <section className="bg-card border-t-2 border-[#004149] py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-2xl md:text-3xl uppercase tracking-widest text-foreground mb-4">
            Ready to Train?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mb-8">
            Browse our courses and find the right fit.
          </p>
          <Link href="/courses">
            <Button variant="accent" size="lg">
              View Courses
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}

function InstructorDossier({
  instructor,
  reversed,
}: {
  instructor: InstructorData;
  reversed: boolean;
}) {
  return (
    <motion.section
      className="bg-background py-16 md:py-20 border-b border-border"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeInUp}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col ${reversed ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-12 items-center`}
        >
          {/* Photo */}
          <div className="w-full md:w-2/5 flex-shrink-0">
            {instructor.image ? (
              <img
                src={instructor.image}
                alt={`${instructor.name} — ${instructor.title}`}
                className="w-full aspect-[3/4] object-cover rounded-sm"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-card border border-border rounded-sm flex items-center justify-center">
                <span className="font-heading text-5xl md:text-6xl text-muted-foreground/40 tracking-widest">
                  {instructor.initials}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="w-full md:w-3/5 space-y-5">
            <div>
              <h3 className="font-heading text-2xl md:text-3xl lg:text-4xl uppercase tracking-widest text-foreground">
                {instructor.name}
              </h3>
              <p className="text-[#006d7a] font-semibold text-base md:text-lg mt-1">
                {instructor.title}
              </p>
            </div>

            <p className="text-muted-foreground text-base leading-relaxed">
              {instructor.bio}
            </p>

            <div>
              <h4 className="font-heading text-sm uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#006d7a]" />
                Certifications & Training
              </h4>
              <ul className="space-y-2">
                {instructor.credentials.map((credential, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{credential}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
```

**Step 2: Verify the dev server compiles without errors**

Run: `cd client && npm run dev` (or check terminal for compilation errors)
Expected: No TypeScript or build errors. Page renders at `/about`.

**Step 3: Commit**

```bash
git add client/src/pages/about.tsx
git commit -m "feat: rewrite about page with dossier layout for three instructors"
```

---

### Task 2: Remove about-chris page and all references

**Files:**
- Delete: `client/src/pages/about-chris.tsx`
- Modify: `client/src/App.tsx:39,131,152` — remove import and route
- Modify: `server/seo.ts:336,425` — remove sitemap and robots entries
- Modify: `server/seoMiddleware.ts:16` — remove from allowed paths

**Step 1: Delete `about-chris.tsx`**

Delete the file `client/src/pages/about-chris.tsx`.

**Step 2: Remove import and route from `App.tsx`**

In `client/src/App.tsx`:

Remove the import line:
```tsx
import AboutChris from "@/pages/about-chris";
```

Remove `'/about-chris'` from the `allowedPaths` array (line ~131).

Remove the route:
```tsx
<Route path="/about-chris" component={AboutChris} />
```

**Step 3: Remove from `server/seo.ts`**

Remove the sitemap entry:
```tsx
{ loc: "/about-chris", priority: "0.6", changefreq: "monthly" },
```

Remove the robots Allow entry:
```
Allow: /about-chris
```

**Step 4: Remove from `server/seoMiddleware.ts`**

Remove `"/about-chris"` from the static paths array (line ~16).

**Step 5: Verify compilation**

Run dev server and confirm no broken imports or routes.

**Step 6: Commit**

```bash
git add -A
git commit -m "remove: delete about-chris page and all references"
```

---

### Task 3: Visual QA and polish

**Files:**
- Modify: `client/src/pages/about.tsx` (if adjustments needed)

**Step 1: Check responsive behavior**

- Desktop (1440px+): Instructor sections alternate left/right photo placement
- Tablet (768px-1024px): Same alternating layout, tighter spacing
- Mobile (<768px): All sections stack — photo on top, content below, no alternation
- Stats bar: 2-column grid on mobile, 4-column on desktop

**Step 2: Verify scroll animations**

- Hero grayscale-on-scroll effect works
- Instructor sections fade in on scroll (Framer Motion)
- Mission statement fades in on scroll

**Step 3: Check design consistency**

- Teal accents match rest of site (`#004149`, `#006d7a`)
- Gold accent button on CTA (`hsl(44, 89%, 61%)`)
- Oswald font for headings, uppercase, tracking-widest
- Inter font for body text
- Dark theme throughout

**Step 4: Commit any polish adjustments**

```bash
git add client/src/pages/about.tsx
git commit -m "style: polish about page responsive layout and animations"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Rewrite about.tsx with full new layout | `about.tsx` |
| 2 | Remove about-chris and all references | `about-chris.tsx`, `App.tsx`, `seo.ts`, `seoMiddleware.ts` |
| 3 | Visual QA and responsive polish | `about.tsx` |
