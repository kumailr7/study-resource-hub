import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '../components/ui/navigation-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TabButton from '../components/ui/TabButton';

interface User {
  id: string;
  username: string;
  role: string;
  status: string;
}

interface Resource {
  id: string; // Adjust based on your actual data structure
  status: string;
}

interface Request {
  id: string; // Adjust based on your actual data structure
  status: string;
}

const AdminDashboard = () => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeResources, setActiveResources] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Admin');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersResponse = await axios.get<User[]>(`${API_BASE_URL}/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUsers(usersResponse.data);
        setTotalUsers(usersResponse.data.length);

        // Fetch active resources
        const resourcesResponse = await axios.get<Resource[]>(`${API_BASE_URL}/resources`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const resources: Resource[] = resourcesResponse.data;
        setActiveResources(resources.filter((resource: Resource) => resource.status === 'active').length);

        // Fetch pending requests
        const requestsResponse = await axios.get<Request[]>(`${API_BASE_URL}/requests`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const requests: Request[] = requestsResponse.data;
        setPendingRequests(requests.filter((request: Request) => request.status === 'pending').length);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex space-x-4 p-4">
        <TabButton
          label="Main Dashboard"
          isActive={activeTab === 'Main'}
          onClick={() => {
            setActiveTab('Main');
            navigate('/user'); // Navigate to Main Dashboard
          }}
        />
        <TabButton
          label="Admin Dashboard"
          isActive={activeTab === 'Admin'}
          onClick={() => setActiveTab('Admin')}
        />
        <div className="flex items-center">
          <span className={`text-white ${isDarkTheme ? 'opacity-50' : ''}`}>Light</span>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
              isDarkTheme ? 'bg-gray-600' : 'bg-yellow-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${
                isDarkTheme ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-white ${isDarkTheme ? '' : 'opacity-50'}`}>Dark</span>
        </div>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="p-4 bg-purple-500">
            <h2 className="text-lg font-bold">Total Users</h2>
            <p className="text-2xl">{totalUsers}</p>
          </Card>
          <Card className="p-4 bg-lightgreen-500">
            <h2 className="text-lg font-bold">Active Resources</h2>
            <p className="text-2xl">{activeResources}</p>
          </Card>
          <Card className="p-4 bg-crimson-500">
            <h2 className="text-lg font-bold">Pending Requests</h2>
            <p className="text-2xl">{pendingRequests}</p>
          </Card>
        </div>
        <Card className={isDarkTheme ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
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

export default AdminDashboard;