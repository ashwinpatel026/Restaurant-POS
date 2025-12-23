# Permission Hook Usage

## usePagePermission

This hook checks if the current user has the required permissions to access a page. If the user doesn't have the required permissions, they will be automatically redirected to the Access Denied page.

### Usage

```tsx
import { usePagePermission } from "@/hooks/usePagePermission";

export default function MyPage() {
  // Check permission to view this page
  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["menu.view"], // Array of permission codes
  });

  // Show loading while checking permissions
  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  // If no permission, the hook will redirect to access denied page
  // This return is just a safety check
  if (!hasPermission) {
    return null;
  }

  // Your page content here
  return (
    <DashboardLayout>
      {/* Page content */}
    </DashboardLayout>
  );
}
```

### Options

- `requiredPermissions` (string[]): Array of permission codes. User must have at least one of these permissions.
- `redirectTo` (string, optional): Custom redirect path. Defaults to `/dashboard/access-denied`.
- `showAccessDenied` (boolean, optional): Whether to redirect to access denied page. Defaults to `true`.

### Return Values

- `hasPermission` (boolean): Whether the user has the required permissions.
- `loading` (boolean): Whether the permission check is in progress.
- `userPermissions` (string[]): Array of all permissions the user has.

### Notes

- SUPER_ADMIN role always has all permissions.
- If no permissions are required, access is automatically granted.
- The hook fetches permissions from `/api/dashboard/user-permissions` which checks the location database.

