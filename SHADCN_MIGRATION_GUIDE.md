# shadcn/ui Migration Guide

## ✅ Completed Migrations

### Core Components
- [x] **InputField** - Uses shadcn Input
- [x] **ConfirmModal** - Uses shadcn Card, Button, Avatar

### Pages
- [x] **AdminDashboard** - Full migration with Table, Button, Badge, Card

---

## 📝 Remaining Pages to Migrate

### High Priority (Heavy UI)
- [ ] StaffAttendanceDashboard
- [ ] LabourAttendanceDashboard  
- [ ] SubcontractorAttendanceDashboard
- [ ] SalaryDashboard (already has dark: classes)
- [ ] SalaryHistory (already has dark: classes)

### Medium Priority (Forms & Auth)
- [ ] Login
- [ ] PunchInScreen
- [ ] SelfieCaptureScreen
- [ ] ProfileScreen
- [ ] CreateProject
- [ ] CreateReimbursement

### Low Priority (Simple Pages)
- [ ] AdminMyTeam
- [ ] AdminBranches
- [ ] AdminVendors
- [ ] AdminLeaves
- [ ] AdminReimbursements

---

## 🎨 Common Migration Patterns

### 1. **Button Migration**

**Before:**
```jsx
<button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
  Click me
</button>
```

**After:**
```jsx
import { Button } from '@/components/ui/button'

<Button className="bg-orange-500 hover:bg-orange-600">
  Click me
</Button>
```

### 2. **Table Migration**

**Before:**
```jsx
<table className="min-w-full">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-4 py-2">Name</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-t hover:bg-gray-50">
      <td className="px-4 py-2">John</td>
    </tr>
  </tbody>
</table>
```

**After:**
```jsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 3. **Badge/Tag Migration**

**Before:**
```jsx
<span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
  Active
</span>
```

**After:**
```jsx
import { Badge } from '@/components/ui/badge'

<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
  Active
</Badge>
```

### 4. **Card Migration**

**Before:**
```jsx
<div className="bg-white rounded-xl shadow p-6">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

**After:**
```jsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```

### 5. **Input Migration**

**Before:**
```jsx
<input 
  type="text"
  className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-orange-500"
  placeholder="Enter text"
/>
```

**After:**
```jsx
import { Input } from '@/components/ui/input'

<Input 
  type="text"
  placeholder="Enter text"
/>
```

---

## 🎯 Color Token Mapping

Replace hardcoded colors with semantic tokens:

| Old Class | shadcn Token | Usage |
|-----------|--------------|-------|
| `text-gray-400` | `text-muted-foreground` | Secondary text |
| `text-gray-900` | `text-foreground` | Primary text |
| `bg-white` | `bg-card` | Card backgrounds |
| `border-gray-300` | `border-border` | Borders |
| `text-red-500` | `text-destructive` | Errors |
| `bg-gray-50` | `bg-secondary` | Secondary bg |

---

## 🚀 Quick Migration Steps

For each page:

1. **Add imports:**
```jsx
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
```

2. **Replace components:**
   - `<button>` → `<Button>`
   - `<table>` → `<Table>` with proper sub-components
   - Inline badges → `<Badge>`
   - Container divs → `<Card>`

3. **Update colors:**
   - Replace gray scale with semantic tokens
   - Use `className` for custom orange brand color

4. **Test dark mode:**
   - Ensure components work in both light and dark themes

---

## 📦 Available shadcn Components

Currently installed:
- ✅ button
- ✅ card
- ✅ input
- ✅ select
- ✅ table
- ✅ badge
- ✅ avatar
- ✅ dialog
- ✅ dropdown-menu
- ✅ separator

### Install More If Needed:

```bash
npx shadcn@latest add [component-name]
```

Popular options:
- `tabs` - For tabbed interfaces
- `toast` - Notification system
- `checkbox` - Form checkboxes
- `radio-group` - Radio buttons
- `switch` - Toggle switches
- `alert` - Alert messages
- `skeleton` - Loading states

---

## 🧪 Testing Checklist

After migrating each page:

- [ ] Page loads without errors
- [ ] All buttons work correctly
- [ ] Forms submit properly
- [ ] Tables display data
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Hover states work
- [ ] Loading states visible

---

## 🗑️ Cleanup

Once migration is complete:

```bash
npm uninstall @chakra-ui/react @emotion/react
```

Remove any unused custom components that were replaced by shadcn.

---

## 💡 Tips

1. **Batch similar pages** - Migrate all attendance dashboards together
2. **Keep it simple** - Don't over-engineer, shadcn components are already great
3. **Test incrementally** - Check each page after migration
4. **Use semantic tokens** - Better dark mode support
5. **Preserve orange brand** - Keep `bg-orange-500` for brand consistency

---

## 📞 Need Help?

shadcn/ui docs: https://ui.shadcn.com
Component examples: https://ui.shadcn.com/docs/components
