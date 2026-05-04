"use client";
import { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Pencil, Trash2, UserPlus, Search } from "lucide-react";
import { createClient } from "~/lib/client";
import Layout from "~/components/ui/layout";
import { Switch } from "~/components/ui/switch";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [isActive,setIsActive] = useState("true");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();
  
  // State Form
  const [formData, setFormData] = useState({ name: "", username: "", password: "", role: "staff" });
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (data) setUsers(data);
  };

  const handleSave = async () => {
    if (isEdit) {
      await supabase.from("users").update({
        name: formData.name,
        username: formData.username,
        password: formData.password,
        role: formData.role
      }).eq("id", formData.id);
    } else {
      await supabase.from("users").insert([
        { name: formData.name, username: formData.username, password: formData.password, role: formData.role }
      ]);
    }
    setIsDialogOpen(false);
    setFormData({ id: "", name: "", username: "", password: "", role: "staff" });
    fetchUsers();
  };


  const openEdit = (user: any) => {
    setIsEdit(true);
    setFormData(user);
    setIsDialogOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSwitch = async (id: string, currentStatus: boolean) => {
    // Kita balikkan statusnya (toggle)
    const { error } = await supabase
      .from("users")
      .update({ is_active: !currentStatus }) // Langsung invert boolean-nya
      .eq("id", id);
    
    if (error) {
      alert(error.message);
      return;
    }

    fetchUsers(); // Refresh data
  };

  return (
    <Layout>
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">Manajemen User</h1>
          <p className="text-xs text-zinc-500 font-bold">Kelola akses admin dan kasir toko.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setIsEdit(false); setFormData({ id: "", name: "", username: "", password: "", role: "staff" }); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <UserPlus size={18} /> Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit User" : "Tambah User Baru"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input placeholder="Nama Lengkap" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              <Input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              <select 
                className="w-full p-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff / Kasir</option>
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase">Simpan Data</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <Input 
              placeholder="Cari nama atau username..." 
              className="pl-10 bg-zinc-950 border-zinc-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500 uppercase text-[10px] font-black">Nama</TableHead>
                <TableHead className="text-zinc-500 uppercase text-[10px] font-black">Username</TableHead>
                <TableHead className="text-zinc-500 uppercase text-[10px] font-black">Role</TableHead>
                <TableHead className="text-zinc-500 uppercase text-[10px] font-black">status</TableHead>
                <TableHead className="text-right text-zinc-500 uppercase text-[10px] font-black">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: any) => (
                <TableRow key={user.id} className="border-zinc-800 hover:bg-zinc-800/30">
                  <TableCell className="font-bold text-zinc-200">{user.name}</TableCell>
                  <TableCell className="font-mono text-zinc-400 text-xs">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={user.role === 'owner' ? 'border-amber-500 text-amber-500' : 'border-blue-500 text-blue-500'}>
                      {user.role?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={user.is_active === true ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}>
                      {user.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(user)} className="text-zinc-400 hover:text-white">
                      <Pencil size={16} />
                    </Button>
                    <Button>
                    <Switch 
                        className="data-[state=checked]:bg-emerald-600" 
                        checked={user.is_active} 
                        onCheckedChange={() => handleSwitch(user.id, user.is_active)} 
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}