import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Shield,
  Mail,
  User as UserIcon,
  MoreVertical
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
import { format } from 'date-fns';

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'employee'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (error: any) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, formData);
        toast.success('User updated successfully');
      } else {
        await api.users.create(formData);
        toast.success('User created successfully');
      }
      setIsAddOpen(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.users.delete(itemToDelete);
      toast.success('User deleted');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      displayName: '',
      password: '',
      role: 'employee'
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-neutral-900 text-white';
      case 'payroll_officer': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'employee': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'department_head': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">User Management</h2>
          <p className="text-neutral-500">Manage all system users, roles, and access credentials.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setEditingUser(null);
            resetForm();
          }
        }}>
          <DialogTrigger render={(props) => (
            <Button {...props} className="bg-neutral-900 text-white gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          )} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                Manage system access and roles for this account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  placeholder="John Doe" 
                  value={formData.displayName}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="john@slsu.edu.ph" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">System Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={v => setFormData({...formData, role: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="payroll_officer">Payroll Officer</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                />
                {editingUser && <p className="text-[10px] text-neutral-400">Leave blank to keep current password</p>}
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-neutral-900 text-white">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Search users by name or email..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="payroll_officer">Payroll Officer</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="department_head">Department Head</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchTerm('');
                setFilterRole('all');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
        <div className="overflow-auto custom-scrollbar max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50/50">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">Loading users...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-neutral-500">No users found.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 text-xs">
                          {u.displayName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{u.displayName}</div>
                          <div className="text-xs text-neutral-400">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadge(u.role)}>
                        {u.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(props) => (
                          <Button {...props} variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        )} />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => {
                            setEditingUser(u);
                            setFormData({
                              email: u.email,
                              displayName: u.displayName,
                              password: '',
                              role: u.role
                            });
                            setIsAddOpen(true);
                          }}>
                            <Edit2 className="w-4 h-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => handleDelete(u.id)}>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <DeleteConfirmationDialog 
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete User"
        description="Are you sure you want to delete this user? This will remove their login access and cannot be undone."
      />
    </div>
  );
};

export default Users;
