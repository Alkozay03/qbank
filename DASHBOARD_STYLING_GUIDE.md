# Dashboard Styling Guide

## Global Box Styling Classes

Use these classes across all dashboard pages for consistent, theme-aware styling.

### Main Container Boxes

Use `.dashboard-box` for main container boxes:

```tsx
<div className="dashboard-box">
  {/* Your content */}
</div>
```

**Features:**
- Light theme-colored background (uses `--color-primary-light`)
- Strong 2px border in theme's primary color
- Rounded corners and shadow effects
- Hover animation
- **Dark mode**: Automatically reverts to subtle transparent design

### Inner Content Boxes

Use `.dashboard-inner-box` for inner content boxes:

```tsx
<div className="dashboard-box">
  <h2>Main Title</h2>
  
  <div className="dashboard-inner-box">
    {/* Inner content - will have white background with sunken effect */}
  </div>
</div>
```

**Features:**
- White background with sunken/inset shadow effect
- Rounded corners
- **Dark mode**: Automatically becomes transparent with no shadow

### Complete Example

```tsx
<div className="dashboard-box">
  <div className="flex items-center mb-4">
    <h2 className="text-xl font-bold">Your Statistics</h2>
  </div>
  
  <div className="space-y-3">
    <div className="dashboard-inner-box flex justify-between">
      <span>Total Score</span>
      <span className="font-bold">95%</span>
    </div>
    
    <div className="dashboard-inner-box flex justify-between">
      <span>Questions Answered</span>
      <span className="font-bold">120</span>
    </div>
  </div>
</div>
```

### Alternative: Using Tailwind Classes Directly

If you prefer Tailwind utility classes:

```tsx
{/* Main box */}
<div className="bg-primary-light rounded-2xl border-2 border-primary shadow-lg p-6 hover:shadow-xl transition-all duration-300">
  
  {/* Inner box */}
  <div className="bg-white rounded-lg shadow-inner p-3">
    {/* Content */}
  </div>
</div>
```

### Dark Mode Behavior

- All dashboard boxes automatically adjust for dark mode
- No need to add special dark mode classes
- Light themes: Show colored backgrounds and strong borders
- Dark theme: Subtle, transparent design maintained

## CircleStat Component Fix

The circle progress calculation has been fixed. The circles now properly fill to 100% using the correct circumference calculation (2πr = 314.159).
