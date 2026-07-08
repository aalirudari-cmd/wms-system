import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';

interface Permission { id: number; key: string; module: string; description: string }
interface Role { id: number; name: string; description?: string; isSystem: boolean; permissions: { permission: Permission }[] }

export function RolesPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = can('roles:manage');

  const roles = useQuery({ queryKey: ['/roles'], queryFn: () => api.get('/roles').then((r) => r.data as Role[]) });
  const permissions = useQuery({ queryKey: ['/roles/permissions'], queryFn: () => api.get('/roles/permissions').then((r) => r.data as Permission[]) });
  const [pending, setPending] = useState<Record<number, Set<string>>>({});

  const saveMutation = useMutation({
    mutationFn: ({ roleId, keys }: { roleId: number; keys: string[] }) => api.put(`/roles/${roleId}/permissions`, { permissionKeys: keys }),
    onSuccess: () => {
      toast({ title: 'Permissions updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/roles'] });
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  if (!roles.data || !permissions.data) return null;

  const modules = [...new Set(permissions.data.map((p) => p.module))];

  function activeKeys(role: Role): Set<string> {
    return pending[role.id] ?? new Set(role.permissions.map((rp) => rp.permission.key));
  }

  function toggle(role: Role, key: string) {
    const current = new Set(activeKeys(role));
    current.has(key) ? current.delete(key) : current.add(key);
    setPending((prev) => ({ ...prev, [role.id]: current }));
  }

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Every role's permission set is configurable at runtime — no redeploy needed." />
      <Tabs defaultValue={String(roles.data[0]?.id)}>
        <TabsList className="mb-4 flex-wrap">
          {roles.data.map((r) => (
            <TabsTrigger key={r.id} value={String(r.id)}>{r.name}</TabsTrigger>
          ))}
        </TabsList>
        {roles.data.map((role) => {
          const keys = activeKeys(role);
          const dirty = pending[role.id] !== undefined;
          return (
            <TabsContent key={role.id} value={String(role.id)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && <Badge variant="secondary">Built-in</Badge>}
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((mod) => (
                      <div key={mod} className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{mod}</p>
                        <div className="flex flex-col gap-1.5">
                          {permissions.data!.filter((p) => p.module === mod).map((p) => (
                            <label key={p.key} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                disabled={!canManage}
                                checked={keys.has(p.key)}
                                onChange={() => toggle(role, p.key)}
                                className="h-4 w-4 rounded border-input"
                              />
                              <span title={p.description}>{p.key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && (
                    <div className="mt-4 flex justify-end gap-2">
                      {dirty && (
                        <Button variant="outline" onClick={() => setPending((prev) => { const next = { ...prev }; delete next[role.id]; return next; })}>
                          Discard
                        </Button>
                      )}
                      <Button
                        disabled={!dirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate({ roleId: role.id, keys: [...keys] })}
                      >
                        Save permissions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
