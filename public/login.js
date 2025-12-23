document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔴 THIS WAS MISSING / NOT RUNNING

    const name = form.name.value;
    const pin = form.pin.value;

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin })
    });

    const result = await res.json();

    if (result.success) {
      window.location.href = "/writer";
    } else {
      msg.innerText = "❌ Invalid name or PIN";
      msg.style.color = "red";
    }
  });
});
