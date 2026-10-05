const API_URL = "https://script.google.com/macros/s/AKfycbznlkXmy90QeWI8lv9PMiCb2XzIu4CoSXnV4GWy9h6c6nUf7XFOLhIyI5E8XFP1hcUUrA/exec";

let requestCounter = 0;
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("checkForm");
    const wingEl = document.getElementById("wing");
    const flatEl = document.getElementById("flat");
    const peopleEl = document.getElementById("people");
    const button = document.getElementById("authorize");
    const msgEl = document.getElementById("msg");
    const resultEl = document.getElementById("result");

    if (!form || !wingEl || !flatEl || !peopleEl || !button || !msgEl || !resultEl) {
        console.error("Required HTML elements are missing.");
        return;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c]));
    }

    function showMessage(text) {
        msgEl.textContent = text;
        msgEl.classList.remove("hide");
    }

    function clearMessage() {
        msgEl.classList.add("hide");
    }

    function clearResult() {
        resultEl.className = "result hide";
        resultEl.innerHTML = "";
    }

    function api(action, params = {}) {
        return new Promise((resolve, reject) => {

            if (API_URL.includes("PASTE_YOUR")) {
                reject(
                    new Error(
                        "Please configure the Apps Script Web App URL in app.js."
                    )
                );
                return;
            }

            const callback =
                `entryCallback_${Date.now()}_${++requestCounter}`;

            const script = document.createElement("script");

            const query = new URLSearchParams({
                action,
                callback,
                ...params
            });

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Request timed out."));
            }, 15000);

            window[callback] = data => {
                cleanup();
                resolve(data);
            };

            script.onerror = () => {
                cleanup();
                reject(
                    new Error(
                        "Unable to connect to Google Apps Script."
                    )
                );
            };

            script.src = `${API_URL}?${query.toString()}`;

            document.body.appendChild(script);

            function cleanup() {
                clearTimeout(timeout);
                delete window[callback];
                script.remove();
            }
        });
    }

    function renderDenied(data, reason) {

        resultEl.className = "result bad";

        resultEl.innerHTML = `
            <h2>❌ Entry Not Authorized</h2>

            <div class="row">
                <span>Wing</span>
                <strong>${escapeHtml(data.wing || "")}</strong>
            </div>

            <div class="row">
                <span>Flat</span>
                <strong>${escapeHtml(data.flat || "")}</strong>
            </div>

            <div class="row">
                <span>Owner / Tenant</span>
                <strong>${escapeHtml(data.occupancy || "")}</strong>
            </div>

            <div class="row">
                <span>Allowed Members</span>
                <strong>${Number(data.memberCount || 0)}</strong>
            </div>

            <div class="row">
                <span>Already Entered Today</span>
                <strong>${Number(data.enteredCount || 0)}</strong>
            </div>

            <div class="row">
                <span>Remaining Today</span>
                <strong>${Number(data.remaining || 0)}</strong>
            </div>

            <p style="margin-top:14px">
                <strong>${escapeHtml(reason)}</strong>
            </p>
        `;
    }

    form.addEventListener("submit", async event => {

        event.preventDefault();

        clearMessage();
        clearResult();

        const wing = wingEl.value.trim();
        const flat = flatEl.value.trim();
        const people = Number.parseInt(
            peopleEl.value,
            10
        );

        if (
            !wing ||
            !flat ||
            !Number.isInteger(people) ||
            people < 1
        ) {
            showMessage(
                "Please select a Wing, enter Flat Number, and enter a valid people count."
            );
            return;
        }

        button.disabled = true;
        button.textContent = "Checking...";

        try {

            const data = await api(
                "authorize",
                {
                    wing,
                    flat,
                    people
                }
            );

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.found) {

                renderDenied(
                    data,
                    "Flat was not found in the selected wing."
                );

                return;
            }

            if (!data.authorized) {

                renderDenied(
                    data,
                    data.reason ||
                    "Entry is not authorized."
                );

                return;
            }

            resultEl.className = "result ok";

            resultEl.innerHTML = `
                <h2>✅ Entry Authorized</h2>

                <div class="row">
                    <span>Wing</span>
                    <strong>${escapeHtml(data.wing)}</strong>
                </div>

                <div class="row">
                    <span>Flat</span>
                    <strong>${escapeHtml(data.flat)}</strong>
                </div>

                <div class="row">
                    <span>Owner / Tenant</span>
                    <strong>${escapeHtml(data.occupancy)}</strong>
                </div>

                <div class="row">
                    <span>Amount Paid</span>
                    <strong>
                        ₹${Number(
                            data.amountPaid || 0
                        ).toLocaleString("en-IN")}
                    </strong>
                </div>

                <div class="row">
                    <span>Allowed Members</span>
                    <strong>${Number(data.memberCount)}</strong>
                </div>

                <div class="row">
                    <span>People Entering Now</span>
                    <strong>${Number(data.peopleEntered)}</strong>
                </div>

                <div class="row">
                    <span>Total Entered Today</span>
                    <strong>${Number(data.enteredCount)}</strong>
                </div>

                <div class="row">
                    <span>Remaining Today</span>
                    <strong>${Number(data.remaining)}</strong>
                </div>

                <p style="margin-top:14px">
                    <strong>
                        Entry recorded successfully.
                    </strong>
                </p>
            `;

            peopleEl.value = "";

        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Unable to process the entry."
            );

        } finally {

            button.disabled = false;
            button.textContent = "Check & Authorize";
        }
    });

});
