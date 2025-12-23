// ==========================
// LOAD LOGGED-IN CUSTOMER
// ==========================
async function loadCustomer() {
  const res = await fetch("/api/customer/me");

  if (res.status === 401) {
    window.location.href = "/customer/login";
    return;
  }

  const data = await res.json();
  document.getElementById("customerName").innerText = data.name;
}

// ==========================
// LOAD CUSTOMER ORDERS
// ==========================
async function loadOrders() {
  const res = await fetch("/api/customer/orders");

  if (res.status === 401) {
    window.location.href = "/customer/login";
    return;
  }

  const orders = await res.json();
  const container = document.getElementById("orders");
  container.innerHTML = "";

  const ids = Object.keys(orders);

  if (ids.length === 0) {
    container.innerHTML = "<p class='text-center'>No orders yet.</p>";
    return;
  }

  for (let id of ids) {
    const o = orders[id];

    const div = document.createElement("div");
    div.className = "order-box";

    div.innerHTML = `
      <p><b>Order ID:</b> ${id}</p>
      <p><b>Task:</b> ${o.task?.type || "—"} — ${o.task?.subject || o.subject}</p>
      <p><b>Deadline:</b> ${o.deadline}</p>
      <p>
        <b>Status:</b>
        <span class="status ${o.status.replace(" ", "-")}">
          ${o.status}
        </span>
      </p>
      ${
        o.writer
          ? `<p><b>Assigned Writer:</b> ${o.writer}</p>`
          : `<p style="color:#6b7280;">Not assigned yet</p>`
      }
    `;

    container.appendChild(div);
  }
}

// ==========================
// LOGOUT
// ==========================
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
}

// ==========================
// INITIAL LOAD
// ==========================
loadCustomer();
loadOrders();

// Auto-refresh every 5 seconds
setInterval(loadOrders, 5000);
