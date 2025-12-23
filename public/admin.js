// ==========================
// ADMIN LOGIN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await res.json();

    if (result.success) {
      window.location.href = "/admin";
    } else {
      document.getElementById("msg").innerText =
        "❌ Invalid admin credentials";
    }
  });
});

// ==========================
// EXPORT DATA
// ==========================
function exportData(type) {
  window.open(`/api/admin/export/${type}`, "_blank");
}

// ==========================
// FORMAT TIME
// ==========================
function fmt(time) {
  if (!time) return "—";
  return new Date(time).toLocaleString();
}

// ==========================
// TAB STATE (SINGLE SOURCE OF TRUTH)
// ==========================
let CURRENT_TAB = "PENDING_APPROVAL";

function switchTab(status, el) {
  CURRENT_TAB = status;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  if (el) el.classList.add("active");
  loadOrders();
}

// ==========================
// LOAD ORDERS
// ==========================
async function loadOrders() {
  const res = await fetch("/api/admin/orders");

  if (res.status === 401) {
    window.location.href = "/admin/login";
    return;
  }

  const orders = await res.json();
  const container = document.getElementById("orders");
  container.innerHTML = "";

  const filtered = Object.entries(orders).filter(
    ([_, o]) => o.status === CURRENT_TAB
  );

  if (filtered.length === 0) {
    container.innerHTML =
      "<p class='text-center'>No orders in this category.</p>";
    return;
  }

  for (const [id, o] of filtered) {
    const t = o.timeline || {};
    let actions = "";

    if (o.status === "PENDING_APPROVAL") {
      actions = `
        <div class="admin-action-buttons">
          <button onclick="approveOrder('${id}')">Approve</button>
          <button onclick="rejectOrder('${id}')">Reject</button>
        </div>
      `;
    } else if (o.status === "CANCELLED" || o.status === "REJECTED") {
      actions = `
        <div class="admin-action-buttons">
          <button onclick="reopenOrder('${id}')">Reopen</button>
        </div>
      `;
    } else {
      actions = `
        <div class="admin-action-buttons">
          <button onclick="cancelOrder('${id}')">Cancel</button>
        </div>
      `;
    }

    const div = document.createElement("div");
    div.className = "order-box";

    div.innerHTML = `
      <p><b>Order ID:</b> ${id}</p>
      <p><b>Task:</b> ${o.taskType || "Assignment"} — ${o.subject}</p>
      <p><b>Pages:</b> ${o.pages}</p>
      <p><b>Deadline:</b> ${o.deadline}</p>

      <p>
        <b>Status:</b>
        <span class="status ${o.status.replace("_", "-")}">
          ${o.status}
        </span>
      </p>

      <p><b>Writer:</b> ${o.writer || "—"}</p>

      <hr>

      <p><b>Timeline</b></p>
      <p>📌 Placed: ${fmt(t.placedAt)}</p>
      <p>✅ Approved: ${fmt(t.approvedAt)}</p>
      <p>✍️ Accepted: ${fmt(t.acceptedAt)}</p>
      <p>📦 Completed: ${fmt(t.completedAt)}</p>

      ${actions}
    `;

    container.appendChild(div);
  }
}

// ==========================
// ADMIN ACTIONS (NO TAB JUMP)
// ==========================
async function approveOrder(id) {
  await fetch("/api/admin/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  loadOrders(); // order disappears from Pending
}

async function rejectOrder(id) {
  await fetch("/api/admin/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  loadOrders();
}

async function cancelOrder(id) {
  await fetch("/api/admin/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  loadOrders();
}

async function reopenOrder(id) {
  await fetch("/api/admin/reopen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  loadOrders();
}

// ==========================
// LOGOUT
// ==========================
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/admin/login";
}



// ==========================
// LOAD AUDIT LOGS
// ==========================
async function loadAuditLogs() {
  const res = await fetch("/api/admin/audit-logs");

  if (res.status === 401) {
    window.location.href = "/admin/login";
    return;
  }

  const logs = await res.json();
  const container = document.getElementById("logs");

  if (!container) return;

  container.innerHTML = "";

  if (logs.length === 0) {
    container.innerHTML =
      "<p class='text-center'>No audit activity recorded yet.</p>";
    return;
  }

  // newest first
  logs.slice().reverse().forEach(log => {
    const div = document.createElement("div");
    div.className = "order-box";

    div.innerHTML = `
      <p><b>Time:</b> ${new Date(log.time).toLocaleString()}</p>
      <p><b>Admin:</b> ${log.admin}</p>
      <p><b>Action:</b> ${log.action}</p>
      <p><b>Order ID:</b> ${log.orderId}</p>
    `;

    container.appendChild(div);
  });
}

// ==========================
// INITIAL LOAD
// ==========================
if (document.getElementById("orders")) loadOrders();
if (document.getElementById("logs")) loadAuditLogs();