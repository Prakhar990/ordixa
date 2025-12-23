document.getElementById("orderForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = e.target;
  const message = document.getElementById("message");
  const submitBtn = form.querySelector("button");

  // ==========================
  // COLLECT FORM DATA
  // ==========================
  const data = {
    customerName: form.customerName.value.trim(),
    customerPhone: form.customerPhone.value.trim(),
    taskType: form.taskType.value,
    subject: form.subject.value.trim(),
    pages: form.pages.value.trim(),
    deadline: form.deadline.value.trim(),
    description: form.description.value.trim()
  };

  // ==========================
  // VALIDATION
  // ==========================
  if (
    !data.customerName ||
    !data.customerPhone ||
    !data.taskType ||
    !data.subject ||
    !data.pages ||
    !data.deadline
  ) {
    message.innerHTML = `
      <div class="empty-state">
        ❌ Please fill all required fields.
      </div>
    `;
    return;
  }

  if (!/^[0-9]{10}$/.test(data.customerPhone)) {
    message.innerHTML = `
      <div class="empty-state">
        ❌ Enter a valid 10-digit phone number.
      </div>
    `;
    return;
  }

  // ==========================
  // UI: SUBMITTING STATE
  // ==========================
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting...";
  message.innerHTML = `
    <div class="empty-state">
      Submitting your order for admin verification...
    </div>
  `;

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.success) {
      message.innerHTML = `
        <div class="empty-state">
          ✅ <b>Order submitted successfully!</b><br><br>

          <b>Order ID:</b> ${result.orderId}<br><br>

          ${
            result.newCustomer
              ? `<b style="color:#dc2626;">
                   Your login PIN: ${result.pin}<br>
                   (Save this PIN safely — you’ll need it to track your order)
                 </b><br><br>`
              : `<b>You can login using your existing PIN.</b><br><br>`
          }

          Status: <b>Pending admin approval</b><br>
          You can track updates from the Customer Dashboard.
        </div>
      `;

      form.reset();

      setTimeout(() => {
        window.location.href = "/";
      }, 4500);
    } else {
      throw new Error("Order failed");
    }
  } catch (err) {
    message.innerHTML = `
      <div class="empty-state">
        ❌ Something went wrong. Please try again later.
      </div>
    `;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit Order";
  }
});
