"use client";

import { useState } from "react";
import { Plus, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccessRow = {
  id: string;
  email: string;
  role: "employee" | "admin";
  active: boolean;
  created_at: string;
};

export function AdminEmployees({
  initialEmployees,
  currentUserEmail
}: {
  initialEmployees: AccessRow[];
  currentUserEmail: string;
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function addEmployee(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const normalized = email.trim().toLowerCase();
      if (!normalized.endsWith("@skyrun.com")) throw new Error("Employee access must use a @skyrun.com email.");
      const { data, error } = await supabase
        .from("estimator_employee_access")
        .upsert({ email: normalized, role, active: true }, { onConflict: "email" })
        .select("*")
        .single();
      if (error) throw error;
      setEmployees((current) => [data as AccessRow, ...current.filter((item) => item.email !== normalized)]);
      setEmail("");
      setStatus(`${normalized} can now sign in with an emailed verification code.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update employee access.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAccess(employee: AccessRow) {
    if (employee.email === currentUserEmail) {
      setStatus("You cannot remove your own administrator access.");
      return;
    }
    if (!window.confirm(`Remove estimator access for ${employee.email}?\n\nThey will no longer be able to open the employee dashboard.`)) return;
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estimator_employee_access")
        .delete()
        .eq("id", employee.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Supabase did not remove this access record. Run the latest admin migration and try again.");
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      setStatus(`${employee.email} no longer has employee access.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not remove access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-grid">
      <section className="panel panel-pad">
        <div className="panel-title"><h2>Employee access</h2><span className="badge green">{employees.filter((item) => item.active).length} active</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td><strong>{employee.email}</strong></td>
                  <td><span className="badge">{employee.role}</span></td>
                  <td>{employee.active ? "Active" : "Inactive"}</td>
                  <td style={{ textAlign: "right" }}>
                    {employee.active && (
                      <button
                        className="button button-danger"
                        onClick={() => removeAccess(employee)}
                        disabled={busy || employee.email === currentUserEmail}
                        aria-label={`Remove access for ${employee.email}`}
                        title={employee.email === currentUserEmail ? "You cannot remove your own access" : "Remove employee access"}
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="eyebrow">Access management</div>
        <h2 style={{ margin: "12px 0 8px" }}>Add an employee</h2>
        <p className="form-help">They will sign in with a verification code sent to their SkyRun inbox. No separate password is required.</p>
        <form onSubmit={addEmployee} style={{ marginTop: 22 }}>
          <div className="field">
            <label>SkyRun email</label>
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@skyrun.com" required />
          </div>
          <div className="field">
            <label>Access level</label>
            <select className="select" value={role} onChange={(event) => setRole(event.target.value as "employee" | "admin")}>
              <option value="employee">Employee — estimates and leads</option>
              <option value="admin">Admin — includes employee access</option>
            </select>
          </div>
          <button className="button button-primary button-wide" disabled={busy}><Plus size={17} /> {busy ? "Updating…" : "Add employee"}</button>
          {status && <div className="form-status">{status}</div>}
        </form>
      </section>
    </div>
  );
}
