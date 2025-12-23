const ADMIN_WHATSAPP = "918923334794"; // 🔴 CHANGE THIS TO ADMIN NUMBER

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
  document.getElementById("customerName").innerText =
    "Customer (" + data.phone + ")";
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
    container.innerHTML =
      "<p class='text-center'>No orders placed yet.</p>";
    return;
  }

  for (let id of ids) {
    const o = orders[id];
    const div = document.createElement("div");
    div.className = "order-box";

    let actionBlock = "";

    // 🔥 PAYMENT FLOW
    if (o.status === "PENDING_APPROVAL") {
      const msg = encodeURIComponent(
        `Hello Admin,\n\nI have placed an order.\n\nOrder ID: ${id}\nSubject: ${o.subject}\nPages: ${o.pages}\nDeadline: ${o.deadline}\n\nPlease share payment details.`
      );

      actionBlock = `
        <div style="margin-top:12px;">
          <p style="color:#d97706;font-weight:600;">
            ⚠ Payment required to proceed
          </p>
          <a 
            href="https://wa.me/${ADMIN_WHATSAPP}?text=${msg}"
            target="_blank"
            class="button"
            style="background:#25D366;"
          >
            💬 Pay via WhatsApp
          </a>
        </div>
      `;
    }

    if (o.status === "OPEN") {
      actionBlock = `
        <p style="color:#16a34a;font-weight:600;">
          ✅ Payment verified. Writers can now accept your order.
        </p>
      `;
    }

    if (o.status === "IN_PROGRESS" && o.writer) {
      actionBlock = `
        <p style="color:#2563eb;font-weight:600;">
          ✍ Assigned Writer: ${o.writer}
        </p>
      `;
    }

    if (o.status === "COMPLETED") {
      actionBlock = `
        <p style="color:#16a34a;font-weight:600;">
          🎉 Order completed successfully
        </p>
      `;
    }

    if (o.status === "CANCELLED") {
      actionBlock = `
        <p style="color:#dc2626;font-weight:600;">
          ❌ Order cancelled by admin
        </p>
      `;
    }

    div.innerHTML = `
      <p><b>Order ID:</b> ${id}</p>
      <p><b>Task Type:</b> ${o.taskType}</p>
      <p><b>Subject:</b> ${o.subject}</p>
      <p><b>Pages:</b> ${o.pages}</p>
      <p><b>Deadline:</b> ${o.deadline}</p>
      <p>
        <b>Status:</b>
        <span class="status ${o.status.replace(" ", "-")}">
          ${o.status}
        </span>
      </p>
      ${actionBlock}
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
// INITIAL LOAD (NO AUTO REFRESH)
// ==========================
loadCustomer();
loadOrders();
