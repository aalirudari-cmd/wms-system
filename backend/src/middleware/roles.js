// Role hierarchy: admin can do everything a manager can, who can do everything
// a worker can. Routes declare the minimum role they require.
const RANK = { worker: 1, manager: 2, admin: 3 };

export function requireRole(minRole) {
  return (req, res, next) => {
    const have = RANK[req.user?.role] || 0;
    const need = RANK[minRole] || 0;
    if (have < need) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}
