# Design System - منصّتي monasti

## الألوان (Color Palette)
### الألوان الرئيسية
- **Primary**: #2563eb (blue-600)
- **Primary Hover**: #1d4ed8 (blue-700)
- **Primary Light**: #dbeafe (blue-100)
- **Primary Dark**: #1e40af (blue-800)

### الألوان الثانوية
- **Secondary**: #10b981 (emerald-500)
- **Secondary Hover**: #059669 (emerald-600)
- **Success**: #22c55e (green-500)
- **Warning**: #f59e0b (amber-500)
- **Error**: #ef4444 (red-500)
- **Info**: #3b82f6 (blue-500)

### الألوان المحايدة
- **Background**: #f8fafc (slate-50)
- **Surface**: #ffffff (white)
- **Surface Hover**: #f1f5f9 (slate-100)
- **Border**: #e2e8f0 (slate-200)
- **Text Primary**: #1e293b (slate-800)
- **Text Secondary**: #64748b (slate-500)
- **Text Disabled**: #94a3b8 (slate-400)

### الألوان للوضع الليلي
- **Background**: #0f172a (slate-900)
- **Surface**: #1e293b (slate-800)
- **Surface Hover**: #334155 (slate-700)
- **Border**: #334155 (slate-700)
- **Text Primary**: #f1f5f9 (slate-100)
- **Text Secondary**: #cbd5e1 (slate-400)
- **Text Disabled**: #64748b (slate-500)

## الخطوط (Typography)
### العربية
- **Font**: Cairo (Google Fonts)
- **Weights**: 300 (Light), 400 (Regular), 600 (SemiBold), 700 (Bold)
- **Sizes**:
  - Display: 2.5rem (40px) - 700
  - Heading 1: 2rem (32px) - 700
  - Heading 2: 1.5rem (24px) - 600
  - Heading 3: 1.25rem (20px) - 600
  - Heading 4: 1.125rem (18px) - 600
  - Body: 1rem (16px) - 400
  - Small: 0.875rem (14px) - 400
  - Caption: 0.75rem (12px) - 400

### الإنجليزية
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Sizes**: Same as Arabic

## المسافات (Spacing)
- **Base Unit**: 0.5rem (8px)
- **Scale**: 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64

### Usage Examples
- **Padding**: p-4 (1rem), p-6 (1.5rem), p-8 (2rem)
- **Margin**: m-4 (1rem), m-auto (auto)
- **Gap**: gap-4 (1rem), gap-6 (1.5rem)

## الشكل (Shape)
- **Border Radius**: 
  - Small: 0.25rem (4px)
  - Medium: 0.5rem (8px)
  - Large: 1rem (16px)
  - Full: 9999px (circle)
- **Border Width**: 1px, 2px
- **Shadow**:
  - Small: 0 1px 2px 0 rgb(0 0 0 / 0.05)
  - Medium: 0 4px 6px -1px rgb(0 0 0 / 0.1)
  - Large: 0 10px 15px -3px rgb(0 0 0 / 0.1)

## المكونات الأساسية (Base Components)

### 1. Button (زر)
```jsx
// Primary Button
<button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
  ابدأ الآن
</button>

// Secondary Button
<button className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
  تعرف أكثر
</button>

// Ghost Button
<button className="text-blue-600 px-6 py-3 font-medium hover:bg-blue-50 rounded-lg transition-colors">
  إلغاء
</button>
```

### 2. Input (حقل إدخال)
```jsx
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
  placeholder="الاسم الكامل"
/>
```

### 3. Card (بطاقة)
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">عنوان البطاقة</h3>
  <p className="text-gray-600">محتوى البطاقة هنا...</p>
</div>
```

### 4. Modal (نافذة منبثقة)
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
    <h3 className="text-xl font-semibold mb-4">عنوان النافذة</h3>
    <p>محتوى النافذة...</p>
  </div>
</div>
```

### 5. Badge (شارة)
```jsx
<span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
  جديد
</span>
```

### 6. Avatar (صورة شخصية)
```jsx
<div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
  ع
</div>
```

### 7. Loading Spinner (محمل)
```jsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
```

### 8. Toast (إشعار)
```jsx
<div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
  تمت العملية بنجاح!
</div>
```

## الأيقونات (Icons)
- **Library**: Lucide React
- **Usage**: `<User className="w-5 h-5" />`
- **Common Icons**:
  - User, Users, UserCheck
  - Calendar, Clock, MapPin
  - Star, StarHalf, StarOff
  - CreditCard, Wallet, Banknote
  - MessageSquare, Phone, Mail
  - Search, Filter, Sort
  - Settings, HelpCircle, LogOut
  - Check, X, AlertCircle

## أنماط التفاعل (Interaction Patterns)

### 1. Hover States
```css
/* Buttons */
.btn-primary:hover {
  background-color: #1d4ed8;
}

/* Cards */
.card:hover {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### 2. Focus States
```css
/* Inputs */
input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

### 3. Transitions
```css
/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

### 4. Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

## أنماط خاصة (Special Styles)

### 1. Trust Badge (شارة الثقة)
```jsx
<div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
  <ShieldCheck className="w-5 h-5 text-green-600" />
  <span className="text-green-800 text-sm font-medium">مدرب موثوق</span>
</div>
```

### 2. Price Tag (سعر)
```jsx
<div className="flex items-center gap-2">
  <span className="text-2xl font-bold text-gray-800">25,000</span>
  <span className="text-gray-500">د.ع</span>
</div>
```

### 3. Rating (تقييم)
```jsx
<div className="flex items-center gap-1">
  {[1, 2, 3, 4, 5].map((star) => (
    <Star
      key={star}
      className={`w-5 h-5 ${
        star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
      }`}
    />
  ))}
  <span className="text-sm text-gray-600 ml-2">(4.0)</span>
</div>
```

### 4. Status Badge (حالة)
```jsx
const StatusBadge = ({ status }) => {
  const variants = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${variants[status]}`}>
      {status}
    </span>
  );
};
```

## Responsive Design
### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Usage
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Content -->
</div>
```

## Dark Mode Support
```jsx
// Toggle button
<button
  onClick={toggleDarkMode}
  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
>
  {darkMode ? <Sun /> : <Moon />}
</button>

// Dark mode classes
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <!-- Content -->
</div>
```

## Accessibility (إمكانية الوصول)
- **ARIA Labels**: Use for interactive elements
- **Keyboard Navigation**: Tab order, Enter/Space activation
- **Color Contrast**: Minimum 4.5:1 for text
- **Focus Visible**: Clear focus indicators
- **Screen Reader**: Proper heading hierarchy

## CSS Variables (for Tailwind)
```css
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --background: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
}

.dark {
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --background: #0f172a;
  --surface: #1e293b;
  --border: #334155;
}
```