const fs = require('fs');
let c = fs.readFileSync('src/pages/Storefront.tsx', 'utf8');

// Fix EventPlannerSite import to use event-planner path
c = c.replace(
  "const EventPlannerSite = lazy(() => import('../platforms/transport/nova-drive/NovaDriveSite'));",
  "const EventPlannerSite = lazy(() => import('../platforms/services/events/event-planner/EventPlannerSite'));"
);

// Add CraftCollectiveSite lazy import after AuraSalonSite
c = c.replace(
  "const AuraSalonSite = lazy(() => import('../platforms/services/beauty/salon/aura-salon/AuraSalonSite'));",
  "const AuraSalonSite = lazy(() => import('../platforms/services/beauty/salon/aura-salon/AuraSalonSite'));\n" +
  "const CraftCollectiveSite = lazy(() => import('../platforms/marketplace/craft-collective/CraftCollectiveSite'));"
);

// Fix event-planner case return statement (replace NovaDriveSite with correct)
c = c.replace(
  "case 'event-planner':\n        return <EventPlannerSite seller={baseProps.seller} products={themeProducts} />;",
  "case 'event-planner':\n        return <EventPlannerSite seller={baseProps.seller} products={themeProducts} />;"
);

// Add craft-collective case after aura-salon case
c = c.replace(
  "case 'aura-salon':\n        return <AuraSalonSite seller={baseProps.seller} products={themeProducts} />;",
  "case 'aura-salon':\n        return <AuraSalonSite seller={baseProps.seller} products={themeProducts} />;\n      case 'craft-collective':\n        return <CraftCollectiveSite seller={baseProps.seller} products={themeProducts} />;"
);

fs.writeFileSync('src/pages/Storefront.tsx', c);
console.log('Storefront.tsx updated');
