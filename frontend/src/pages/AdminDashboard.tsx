import { useTheme } from '../ThemeContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '../components/ui/navigation-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

const AdminDashboard = () => {
  const { isDarkTheme } = useTheme();
  const [users, setUsers] = React.useState([]);

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navigation */}
      <NavigationMenu className={`p-4 border-b ${isDarkTheme ? 'border-gray-800' : 'border-gray-200'}`}>
        <NavigationMenuList className="space-x-6">
          <NavigationMenuItem>
            <NavigationMenuLink className={`font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
              Dashboard
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink className={`font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
              Users
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      {/* Main Content */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={isDarkTheme ? 'bg-gray-800' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">42</p>
            </CardContent>
          </Card>
          <Card className={isDarkTheme ? 'bg-gray-800' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Active Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">156</p>
            </CardContent>
          </Card>
          <Card className={isDarkTheme ? 'bg-gray-800' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">8</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className={isDarkTheme ? 'bg-gray-800' : ''}>
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle>User Management</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Add User</Button>
              </DialogTrigger>
              <DialogContent className={isDarkTheme ? 'bg-gray-800' : ''}>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system
                  </DialogDescription>
                </DialogHeader>
                {/* Add User Form Here */}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};