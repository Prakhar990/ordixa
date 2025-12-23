// ==========================
// LOAD LOGGED-IN USER
// ==========================
async function loadUser() {
  const res = await fetch("/api/me");

  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }

  const data = await res.json();
  document.getElementById("username").innerText = data.user;
}

// ==========================
// LOAD ORDERS (SECTIONED)
// ==========================
async function loadOrders() {
  const res = await fetch("/api/orders");

  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }

  const orders = await res.json();

  const openBox = document.getElementById("orders-open");
  const progressBox = document.getElementById("orders-progress");
  const completedBox = document.getElementById("orders-completed");

  openBox.innerHTML = "";
  progressBox.innerHTML = "";
  completedBox.innerHTML = "";

  let hasOpen = false;
  let hasProgress = false;
  let hasCompleted = false;

  for (let id in orders) {
    const o = orders[id];

    const div = document.createElement("div");
    div.className = "order-box";

    div.innerHTML = `
      <p><b>Order ID:</b> ${id}</p>
      <p><b>Subject:</b> ${o.subject}</p>
      <p><b>Pages:</b> ${o.pages}</p>
      <p><b>Status:</b>
        <span class="status ${o.status.replace(/_/g, "-")}">
          ${o.status.replace(/_/g, " ")}
        </span>
      </p>
    `;

    // ==========================
    // OPEN ORDERS
    // ==========================
    if (o.status === "OPEN") {
      hasOpen = true;
      div.innerHTML += `
        <button class="accept" onclick="acceptOrder('${id}')">
          Accept Order
        </button>
      `;
      openBox.appendChild(div);
    }

    // ==========================
    // IN PROGRESS ORDERS
    // ==========================
    else if (o.status === "IN_PROGRESS") {
      hasProgress = true;
      div.innerHTML += `
        <p><b>Writer:</b> ${o.writer}</p>
        <button class="complete" onclick="completeOrder('${id}')">
          Mark Completed
        </button>
      `;
      progressBox.appendChild(div);
    }

    // ==========================
    // COMPLETED ORDERS
    // ==========================
    else if (o.status === "COMPLETED") {
      hasCompleted = true;
      div.innerHTML += `
        <p><b>Writer:</b> ${o.writer}</p>
      `;
      completedBox.appendChild(div);
    }
  }

  // ==========================
  // EMPTY STATES
  // ==========================
  if (!hasOpen) {
    openBox.innerHTML = `
      <div class="empty-state">
        No available orders right now.
      </div>
    `;
  }

  if (!hasProgress) {
    progressBox.innerHTML = `
      <div class="empty-state">
        No orders in progress.
      </div>
    `;
  }

  if (!hasCompleted) {
    completedBox.innerHTML = `
      <div class="empty-state">
        No completed orders yet.
      </div>
    `;
  }
}

// ==========================
// ACCEPT ORDER
// ==========================
async function acceptOrder(id) {
  const res = await fetch("/api/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }

  loadOrders();
}

// ==========================
// COMPLETE ORDER
// ==========================
async function completeOrder(id) {
  const res = await fetch("/api/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }

  loadOrders();
}

// ==========================
// LOGOUT
// ==========================
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
}

// ==========================
// INITIAL LOAD
// ==========================
loadUser();
loadOrders();

// Auto-refresh every 5 seconds
setInterval(loadOrders, 5000);
