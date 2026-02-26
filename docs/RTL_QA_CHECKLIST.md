# RTL UI – Manual QA Checklist

## Mobile

- [ ] **Sidebar/Drawer**
  - [ ] Hamburger opens drawer from the RIGHT edge
  - [ ] Drawer slides in with animation (200ms)
  - [ ] Backdrop dims content; tap backdrop closes drawer
  - [ ] Close (X) button works
  - [ ] Escape key closes drawer
  - [ ] Body scroll locked when drawer open; restored when closed

- [ ] **Header**
  - [ ] Logo is on the RIGHT
  - [ ] Hamburger is on the LEFT
  - [ ] Title (if any) between logo and hamburger

- [ ] **Footer**
  - [ ] Footer visible at bottom: "זכויות יוצרים © פזצט״א"
  - [ ] Centered, muted, small text
  - [ ] Spacing (py-6) looks correct

- [ ] **RTL alignment**
  - [ ] Nav items align correctly
  - [ ] Text flows right-to-left
  - [ ] No obvious LTR misalignment

## Desktop

- [ ] **Sidebar**
  - [ ] Sidebar visible on the RIGHT
  - [ ] Content area to the left of sidebar
  - [ ] No drawer overlay on desktop (md+)

- [ ] **Header**
  - [ ] Logo on the RIGHT
  - [ ] No hamburger (or hidden on desktop)

- [ ] **Footer**
  - [ ] Footer visible on all pages
  - [ ] Layout not broken by footer

## Pages to test

- [ ] `/student` (Student dashboard)
- [ ] `/teacher/dashboard` (Teacher dashboard)
- [ ] `/admin` (Admin)
- [ ] `/book` (Booking flow)
- [ ] `/login` (Login pages)
