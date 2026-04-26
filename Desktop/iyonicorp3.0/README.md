# Iyonicorp - Multi-Tenant E-Commerce Platform

A comprehensive, scalable multi-tenant e-commerce platform that surpasses Shopify by enabling sellers to operate independent online stores with their own customer bases.

## 🚀 Features

### Three Distinct User Roles

#### 1. **Seller Dashboard**
- **Product Management**: Add, edit, delete, and manage product catalog
- **Order Management**: Track and update order statuses (pending, processing, shipped, delivered, cancelled)
- **Customer Management**: View customer details, order history, and spending patterns
- **Analytics**: Revenue tracking, top products, sales trends, and performance metrics
- **Store Settings**: Configure store name, description, subdomain, and branding
- **Storefront Customization**: Live preview editor with theme customization (colors, fonts, layout)

#### 2. **Seller Manager Dashboard**
- **Seller Portfolio**: Oversee multiple seller accounts
- **Subscription Management**: Manage seller plans (Starter, Professional, Enterprise)
- **Performance Monitoring**: Track seller revenue, orders, and activity
- **Commission Tracking**: Monitor earnings from managed sellers
- **Support System**: Handle seller support requests and tickets
- **Analytics**: Comprehensive insights across all managed sellers

#### 3. **Manager Admin Dashboard**
- **Platform Overview**: Complete system health and metrics
- **All Sellers Management**: View and manage every seller on the platform
- **Seller Managers**: Add and manage seller managers
- **System Monitoring**: Server status, CPU, storage, database, bandwidth metrics
- **Security**: Two-factor authentication, IP whitelisting, session management
- **Platform Settings**: Global configuration, notifications, and integrations
- **Analytics**: Platform-wide statistics and revenue distribution

### Multi-Tenant Architecture
- **Subdomain-based Tenancy**: Each seller gets a unique subdomain (e.g., `storename.iyonicorp.com`)
- **Isolated Data**: Each tenant has isolated product, order, and customer data
- **Custom Branding**: Sellers can customize colors, fonts, and store appearance
- **Scalable Infrastructure**: Built to handle thousands of concurrent sellers

### Storefront Customization
- **Live Preview**: Real-time preview of store changes
- **Theme System**: Color presets and custom color picker
- **Typography**: Multiple font family options
- **Responsive Preview**: Desktop, tablet, and mobile views
- **Layout Options**: Multiple homepage layout styles

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Build Tool**: Vite
- **Utilities**: clsx, tailwind-merge

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd iyonicorp

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔑 Demo Credentials

### Seller Account
- **Email**: seller@example.com
- **Password**: password
- **Role**: Seller

### Seller Manager Account
- **Email**: manager@iyonicorp.com
- **Password**: password
- **Role**: Seller Manager

### Manager Admin Account
- **Email**: admin@iyonicorp.com
- **Password**: password
- **Role**: Manager Admin

## 📁 Project Structure

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx          # Reusable button component
│       ├── Card.tsx            # Card container component
│       ├── Input.tsx           # Form input components
│       ├── Modal.tsx           # Modal dialog component
│       ├── Table.tsx           # Data table components
│       ├── Badge.tsx           # Status badge component
│       └── index.ts            # Component exports
├── context/
│   ├── AuthContext.tsx         # Authentication state management
│   ├── DataContext.tsx         # Multi-tenant data management
│   └── TenantContext.tsx       # Tenant detection and routing
├── pages/
│   ├── auth/
│   │   ├── Login.tsx           # Login page with role selection
│   │   └── Register.tsx        # Registration page
│   ├── seller/
│   │   ├── SellerDashboard.tsx # Seller main dashboard
│   │   └── StorefrontCustomizer.tsx # Store customization tool
│   ├── manager/
│   │   └── SellerManagerDashboard.tsx # Manager dashboard
│   ├── admin/
│   │   └── ManagerAdminDashboard.tsx # Admin dashboard
│   ├── Dashboard.tsx           # Legacy dashboard (Coolify)
│   └── Storefront.tsx          # Customer-facing storefront
├── utils/
│   └── coolify.ts              # Coolify API utilities
├── App.tsx                     # Main application component
├── main.tsx                    # Application entry point
└── index.css                   # Global styles
```

## 🎨 UI Components

### Button
```tsx
<Button variant="primary" size="md" isLoading={false}>
  Click Me
</Button>
```

**Variants**: primary, secondary, outline, ghost, danger
**Sizes**: sm, md, lg

### Card
```tsx
<Card padding="md">
  <CardHeader title="Title" subtitle="Subtitle" />
  Content here
</Card>
```

### Input
```tsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

### Table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell><Badge variant="success">Active</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Badge
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Cancelled</Badge>
```

**Variants**: default, success, warning, danger, info, purple

### Modal
```tsx
<Modal isOpen={true} onClose={() => {}} title="Modal Title" size="lg">
  Modal content here
</Modal>
```

**Sizes**: sm, md, lg, xl

## 🔐 Authentication Flow

1. **Tenant Detection**: System detects if user is on main platform or tenant subdomain
2. **Role Selection**: Users select their role (Seller, Seller Manager, Manager Admin)
3. **Login/Register**: Authenticate with email and password
4. **Dashboard Routing**: Automatic routing to role-specific dashboard
5. **Session Management**: Persistent sessions with localStorage

## 📊 Data Architecture

### Multi-Tenant Data Isolation
- Each seller has a unique `sellerId`
- Products, orders, and customers are filtered by `sellerId`
- Managers can access data for their managed sellers
- Admins have access to all platform data

### Data Models

**Product**
```typescript
interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

**Order**
```typescript
interface Order {
  id: string;
  sellerId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}
```

**Seller**
```typescript
interface Seller {
  id: string;
  userId: string;
  storeName: string;
  subdomain: string;
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    startDate: string;
    endDate: string;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
  };
  createdAt: string;
}
```

## 🎯 Key Features Comparison with Shopify

| Feature | Iyonicorp | Shopify |
|---------|-----------|---------|
| Multi-tenancy | ✅ Native | ✅ Native |
| Seller Managers | ✅ Built-in | ❌ Third-party |
| Admin Dashboard | ✅ Comprehensive | ✅ Basic |
| Storefront Customizer | ✅ Live Preview | ✅ Theme Editor |
| Role-based Access | ✅ 3 Roles | ✅ 2 Roles |
| Commission System | ✅ Built-in | ❌ Third-party |
| System Monitoring | ✅ Built-in | ❌ Limited |
| Security Features | ✅ Advanced | ✅ Standard |

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Environment Variables
Create a `.env` file:
```env
VITE_COOLIFY_API_TOKEN=your_token_here
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@iyonicorp.com or join our Slack channel.

## 🙏 Acknowledgments

- Built with React and TypeScript
- Styled with Tailwind CSS
- Icons by Lucide React
- Powered by Vite

---

**Iyonicorp** - The easiest way to launch your multi-tenant store.
