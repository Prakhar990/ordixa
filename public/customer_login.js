document
  .getElementById("customerLoginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const phone = document.getElementById("phone").value.trim();
    const pin = document.getElementById("pin").value.trim();
    const msg = document.getElementById("msg");

    const res = await fetch("/api/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin })
    });

    const result = await res.json();

    if (result.success) {
      window.location.href = "/customer/dashboard";
    } else {
      msg.innerText = "❌ Invalid phone or PIN";
    }
  });
