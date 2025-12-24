const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("SERVER FILE LOADED");

/* ======================
   MIDDLEWARE
====================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "hostel-secret-key",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: false,
      sameSite: "lax"
    }
  })
);

/* ======================
   AUTH GUARDS
====================== */
function requireWriter(req, res, next) {
  if (!req.session.writer) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect("/admin/login");
  next();
}

function requireCustomer(req, res, next) {
  if (!req.session.customerPhone) return res.status(401).json({ error: "Unauthorized" });
  next();
}

/* ======================
   DATA HELPERS
====================== */
const DATA_FILE = path.join(__dirname, "data.json");

function readData() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  if (!data.orders) data.orders = {};
  if (!data.auditLogs) data.auditLogs = [];
  if (!data.customers) data.customers = {};
  if (!data.writers) data.writers = {};
  return data;
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function ensureTimeline(order) {
  if (!order.timeline) order.timeline = {};
}

/* ======================
   AUDIT LOG
====================== */
function addAuditLog(action, orderId) {
  const data = readData();
  data.auditLogs.push({
    time: new Date().toISOString(),
    admin: "admin",
    action,
    orderId
  });
  writeData(data);
}

/* ======================
   PAGE ROUTES
====================== */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/order", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "order.html"))
);

app.get("/rules", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "platform_rules.html"))
);

/* WRITER */
app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html"))
);

app.get("/writer", (req, res) =>
  req.session.writer
    ? res.sendFile(path.join(__dirname, "public", "private_writer.html"))
    : res.redirect("/login")
);

/* CUSTOMER */
app.get("/customer/login", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "customer_login.html"))
);

app.get("/customer/dashboard", (req, res) =>
  req.session.customerPhone
    ? res.sendFile(path.join(__dirname, "public", "customer_dashboard.html"))
    : res.redirect("/customer/login")
);

/* ADMIN */
app.get("/admin/login", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "admin_login.html"))
);

app.get("/admin", requireAdmin, (_, res) =>
  res.sendFile(path.join(__dirname, "public", "admin_dashboard.html"))
);

app.get("/admin/audit", requireAdmin, (_, res) =>
  res.sendFile(path.join(__dirname, "public", "admin_audit.html"))
);

/* ======================
   AUTH APIs
====================== */
app.post("/api/login", (req, res) => {
  const { name, pin } = req.body;
  const data = readData();

  if (data.writers?.[name]?.password === pin) {
    req.session.writer = name;
    req.session.admin = null;
    req.session.customerPhone = null;
    return res.json({ success: true });
  }

  res.json({ success: false });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const data = readData();

  if (data.admin?.username === username && data.admin?.password === password) {
    req.session.admin = true;
    req.session.writer = null;
    req.session.customerPhone = null;
    return res.json({ success: true });
  }

  res.json({ success: false });
});

app.post("/api/customer/login", (req, res) => {
  const { phone, pin } = req.body;
  const data = readData();

  if (data.customers?.[phone]?.pin !== pin) {
    return res.json({ success: false });
  }

  req.session.customerPhone = phone;
  req.session.writer = null;
  req.session.admin = null;

  res.json({ success: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});




/* ======================
   CUSTOMER APIs (FIX)
====================== */
app.get("/api/customer/me", requireCustomer, (req, res) => {
  res.json({
    phone: req.session.customerPhone
  });
});

app.get("/api/customer/orders", requireCustomer, (req, res) => {
  const data = readData();
  const phone = req.session.customerPhone;
  const result = {};

  for (let id in data.orders) {
    const o = data.orders[id];

    // 🔥 SINGLE SOURCE OF TRUTH
    if (o.customer && o.customer.phone === phone) {
      ensureTimeline(o);
      result[id] = o;
    }
  }

  res.json(result);
});

/* ======================
   CREATE ORDER
====================== */
app.post("/api/order", (req, res) => {
  const data = readData();
  const {
    customerName,
    customerPhone,
    taskType,
    subject,
    pages,
    deadline,
    description
  } = req.body;

  if (!customerName || !customerPhone) {
    return res.json({ success: false });
  }

  let generatedPin = null;

  if (!data.customers[customerPhone]) {
    generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    data.customers[customerPhone] = {
      name: customerName,
      pin: generatedPin,
      createdAt: new Date().toISOString()
    };
  }

  const orderId = Date.now().toString();

  data.orders[orderId] = {
    taskType,
    subject,
    pages,
    deadline,
    description,
    status: "PENDING_APPROVAL",
    writer: "",
    customer: {
      name: customerName,
      phone: customerPhone
    },
    timeline: {
      placedAt: new Date().toISOString()
    }
  };

  writeData(data);

  res.json({
    success: true,
    orderId,
    newCustomer: Boolean(generatedPin),
    pin: generatedPin
  });
});

/* ======================
   WRITER APIs
====================== */
app.get("/api/orders", requireWriter, (req, res) => {
  const data = readData();
  const writer = req.session.writer;
  const visible = {};

  for (let id in data.orders) {
    const o = data.orders[id];
    ensureTimeline(o);

    if (
      o.status === "OPEN" ||
      (o.writer === writer &&
        !["PENDING_APPROVAL", "REJECTED"].includes(o.status))
    ) {
      visible[id] = o;
    }
  }

  res.json(visible);
});

app.post("/api/accept", requireWriter, (req, res) => {
  const data = readData();
  const o = data.orders[req.body.id];
  if (!o || o.status !== "OPEN") return res.json({ success: false });

  ensureTimeline(o);
  o.status = "IN_PROGRESS";
  o.writer = req.session.writer;
  o.timeline.acceptedAt = new Date().toISOString();

  writeData(data);
  res.json({ success: true });
});

app.post("/api/complete", requireWriter, (req, res) => {
  const data = readData();
  const o = data.orders[req.body.id];
  if (!o) return res.json({ success: false });

  ensureTimeline(o);
  o.status = "COMPLETED";
  o.timeline.completedAt = new Date().toISOString();

  writeData(data);
  res.json({ success: true });
});

/* ======================
   ADMIN APIs (FIXED)
====================== */
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const data = readData();
  Object.values(data.orders).forEach(ensureTimeline);
  res.json(data.orders);
});

app.get("/api/admin/audit-logs", requireAdmin, (req, res) => {
  res.json(readData().auditLogs);
});

/* ====== Approve Order ====== */
app.post("/api/admin/approve", requireAdmin, (req, res) => {
  const data = readData();
  const o = data.orders[req.body.id];
  if (!o) return res.json({ success: false });

  ensureTimeline(o);
  o.status = "OPEN";
  o.timeline.approvedAt = new Date().toISOString();

  writeData(data);

  // 🔥 THIS LINE WAS MISSING / BROKEN
  addAuditLog("APPROVE_ORDER", req.body.id);

  res.json({ success: true });
});
/* ====== Reject Order ====== */
app.post("/api/admin/reject", requireAdmin, (req, res) => {
  const data = readData();
  const id = req.body.id;
  const o = data.orders[id];
  if (!o) return res.json({ success: false });

  ensureTimeline(o);
  o.status = "REJECTED";
  o.timeline.rejectedAt = new Date().toISOString();

  writeData(data);
  addAuditLog("REJECTED_ORDER", id);

  res.json({ success: true });
});

/* ====== Cancel Order ====== */
app.post("/api/admin/cancel", requireAdmin, (req, res) => {
  const data = readData();
  const id = req.body.id;
  const o = data.orders[id];
  if (!o) return res.json({ success: false });

  ensureTimeline(o);
  o.status = "CANCELLED";
  o.timeline.cancelledAt = new Date().toISOString();

  writeData(data);
  addAuditLog("CANCELLED_ORDER", id);

  res.json({ success: true });
});

/* ====== Reopen Order ====== */
app.post("/api/admin/reopen", requireAdmin, (req, res) => {
  const data = readData();
  const id = req.body.id;
  const o = data.orders[id];
  if (!o) return res.json({ success: false });

  ensureTimeline(o);
  o.status = "OPEN";
  o.writer = "";
  o.timeline.reopenedAt = new Date().toISOString();

  writeData(data);
  addAuditLog("REOPENED_ORDER", id);

  res.json({ success: true });
});

/* ======================
   🔥 EXPORT APIs (NEW)
====================== */
function exportJSON(res, filename, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.send(JSON.stringify(data, null, 2));
}

app.get("/api/admin/export/orders", requireAdmin, (req, res) => {
  exportJSON(res, "orders.json", readData().orders);
});

app.get("/api/admin/export/customers", requireAdmin, (req, res) => {
  exportJSON(res, "customers.json", readData().customers);
});

app.get("/api/admin/export/writers", requireAdmin, (req, res) => {
  exportJSON(res, "writers.json", readData().writers);
});

app.get("/api/admin/export/full", requireAdmin, (req, res) => {
  exportJSON(res, "full_backup.json", readData());
});

/* ======================
   START SERVER
====================== */
app.listen(PORT, () =>
  console.log("Server running on http://localhost:" + PORT)
);

