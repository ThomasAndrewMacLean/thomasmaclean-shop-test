import { Component } from "@theme/component";
import { ThemeEvents } from "@theme/events";

/**
 * A custom element that manages the notify me functionality when products are out of stock.
 * @extends Component
 */
export class NotifyMeComponent extends Component {
  /** @type {EventListener} */
  boundVariantUpdateHandler;

  connectedCallback() {
    super.connectedCallback();

    this.setupNotifyButton();

    // Listen for variant update events to show/hide the notify me button
    this.setupVariantUpdateListener();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // Clean up event listeners
    if (this.boundVariantUpdateHandler) {
      const section = this.closest(".shopify-section") || document;
      section.removeEventListener(
        ThemeEvents.variantUpdate,
        this.boundVariantUpdateHandler
      );
      section.removeEventListener(
        ThemeEvents.variantSelected,
        this.boundVariantUpdateHandler
      );
    }
  }

  /**
   * Sets up the notify button event listener
   */
  setupNotifyButton() {
    const notifyButton = this.querySelector("#notify-me-button");
    if (notifyButton) {
      notifyButton.addEventListener(
        "click",
        this.handleNotifyMeClick.bind(this)
      );
    }
  }

  /**
   * Sets up event listeners for variant updates to dynamically show/hide the notify me button
   */
  setupVariantUpdateListener() {
    // Listen for variant update events on the closest section or document
    const section = this.closest(".shopify-section") || document;

    // Create bound handler for cleanup
    this.boundVariantUpdateHandler = (event) => {
      this.handleVariantUpdate(/** @type {CustomEvent} */ (event));
    };

    section.addEventListener(
      ThemeEvents.variantUpdate,
      this.boundVariantUpdateHandler
    );

    // Also listen for variant selected events
    section.addEventListener(
      ThemeEvents.variantSelected,
      this.boundVariantUpdateHandler
    );
  }

  /**
   * Handles variant update events to show/hide the notify me button
   * @param {CustomEvent} event - The variant update event
   */
  handleVariantUpdate(event) {
    const variant = event.detail?.resource;
    const notifyButton = this.querySelector("#notify-me-button");

    if (!notifyButton) return;

    // Show/hide based on variant availability
    if (variant && variant.available === false) {
      // Variant is not available, show notify me button
      this.style.display = "block";
      /** @type {HTMLElement} */ (notifyButton).style.display = "flex";
      console.log(
        "Showing notify me button - variant not available:",
        variant.id
      );
    } else if (variant && variant.available === true) {
      // Variant is available, hide notify me button
      this.style.display = "none";
      /** @type {HTMLElement} */ (notifyButton).style.display = "none";
      console.log("Hiding notify me button - variant available:", variant.id);
    } else {
      // If variant is null/undefined, we might be in a state where no variant is selected
      // In this case, hide the notify me button
      this.style.display = "none";
      /** @type {HTMLElement} */ (notifyButton).style.display = "none";
      console.log("Hiding notify me button - no variant selected");
    }
  }

  /**
   * Handles the notify me button click event.
   * Shows a popup modal to collect email address.
   */
  handleNotifyMeClick() {
    console.log("Notify me button clicked");
    this.showEmailModal();
  }

  /**
   * Shows the email collection modal
   */
  showEmailModal() {
    // Create modal HTML
    const modalHTML = `
      <div id="notify-me-modal" class="notify-me-modal">
        <div class="notify-me-modal__backdrop"></div>
        <div class="notify-me-modal__content">
          <div class="notify-me-modal__header">
            <h3>Notify me when available</h3>
            <button class="notify-me-modal__close" type="button" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="notify-me-modal__body">
            <p>Enter your email address and we'll notify you when this product is back in stock.</p>
            <form id="notify-me-form" class="notify-me-form">
              <div class="notify-me-form__field">
                <label for="notify-email" class="notify-me-form__label">Email Address</label>
                <input 
                  type="email" 
                  id="notify-email" 
                  name="email" 
                  class="notify-me-form__input" 
                  placeholder="Enter your email"
                  required
                >
              </div>
              <div class="notify-me-form__actions">
                <button type="submit" class="notify-me-form__submit">Notify Me</button>
                <button type="button" class="notify-me-form__cancel">Cancel</button>
              </div>
              <div class="notify-me-form__message" style="display: none;"></div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Get references to modal elements
    const modal = document.getElementById("notify-me-modal");
    if (!modal) return;

    const form = document.getElementById("notify-me-form");
    if (!form) return;

    const closeButton = modal.querySelector(".notify-me-modal__close");
    const cancelButton = modal.querySelector(".notify-me-form__cancel");
    const backdrop = modal.querySelector(".notify-me-modal__backdrop");
    const messageDiv = modal.querySelector(".notify-me-form__message");

    // Show modal
    requestAnimationFrame(() => {
      modal.classList.add("notify-me-modal--visible");
    });

    // Handle escape key
    /** @type {(e: KeyboardEvent) => void} */
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    // Close modal handlers
    const closeModal = () => {
      document.removeEventListener("keydown", handleKeydown);
      modal.classList.remove("notify-me-modal--visible");
      setTimeout(() => {
        modal.remove();
      }, 300);
    };

    document.addEventListener("keydown", handleKeydown);

    if (closeButton) {
      closeButton.addEventListener("click", closeModal);
    }
    if (cancelButton) {
      cancelButton.addEventListener("click", closeModal);
    }
    if (backdrop) {
      backdrop.addEventListener("click", closeModal);
    }

    // Handle form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector("#notify-email");
      const submitButton = form.querySelector(".notify-me-form__submit");
      if (!emailInput || !messageDiv || !submitButton) return;

      const email = /** @type {HTMLInputElement} */ (emailInput).value.trim();

      // Basic email validation
      if (!email || !email.includes("@")) {
        this.showMessage(
          /** @type {HTMLElement} */ (messageDiv),
          "Please enter a valid email address.",
          "error"
        );
        return;
      }

      const variantId = this.getVariantId();
      console.log("Found variant ID:", variantId);

      if (!variantId) {
        this.showMessage(
          /** @type {HTMLElement} */ (messageDiv),
          "Error: Could not determine product variant.",
          "error"
        );
        return;
      }

      // Disable submit button and show loading state
      /** @type {HTMLButtonElement} */ (submitButton).disabled = true;
      const originalText = submitButton.textContent;
      submitButton.textContent = "Submitting...";

      try {
        await this.submitNotification(variantId, email);
        this.showMessage(
          /** @type {HTMLElement} */ (messageDiv),
          "Thank you! We'll notify you when this product is back in stock.",
          "success"
        );

        // Clear the form
        /** @type {HTMLInputElement} */ (emailInput).value = "";

        // Close modal after 2.5 seconds
        setTimeout(closeModal, 2500);
      } catch (error) {
        console.error("Error submitting notification:", error);
        const errorMessage =
          error.message || "Sorry, there was an error. Please try again.";
        this.showMessage(
          /** @type {HTMLElement} */ (messageDiv),
          errorMessage,
          "error"
        );
      } finally {
        // Re-enable submit button
        /** @type {HTMLButtonElement} */ (submitButton).disabled = false;
        submitButton.textContent = originalText;
      }
    });

    // Focus on email input
    setTimeout(() => {
      const emailInput = modal.querySelector("#notify-email");
      if (emailInput) {
        /** @type {HTMLInputElement} */ (emailInput).focus();
      }
    }, 100);
  }

  /**
   * Gets the current variant ID from the product form
   * @returns {string|null} The variant ID
   */
  getVariantId() {
    // First try to find variant ID from the closest product form
    const productForm = this.closest("product-form-component");
    if (productForm) {
      const variantInput = productForm.querySelector(
        'input[name="id"], input[ref="variantId"]'
      );
      if (variantInput) {
        const value = /** @type {HTMLInputElement} */ (variantInput).value;
        if (value && value !== "") {
          return value;
        }
      }
    }

    // Try to get from any product form in the same section
    const section = this.closest(".shopify-section");
    if (section) {
      const allVariantInputs = section.querySelectorAll(
        'input[name="id"], input[ref="variantId"]'
      );
      for (const input of allVariantInputs) {
        const value = /** @type {HTMLInputElement} */ (input).value;
        if (value && value !== "") {
          return value;
        }
      }
    }

    // Fallback: try to get from variant picker
    const variantPicker = document.querySelector("variant-picker");
    if (variantPicker) {
      const selectedVariant = variantPicker.querySelector(
        "input[data-variant-id]:checked"
      );
      if (selectedVariant) {
        const variantId = /** @type {HTMLInputElement} */ (selectedVariant)
          .dataset.variantId;
        if (variantId) {
          return variantId;
        }
      }
    }

    // Try to get from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const variantFromUrl = urlParams.get("variant");
    if (variantFromUrl) {
      return variantFromUrl;
    }

    console.warn("Could not find variant ID");
    return null;
  }

  /**
   * Submits the notification request to Klaviyo
   * @param {string} variantId - The product variant ID
   * @param {string} email - The user's email address
   */
  async submitNotification(variantId, email) {
    try {
      const response = await fetch(
        "https://klaviyo-shopify-sync-418706328134.us-central1.run.app/subscribe-back-in-stock",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            variantId: variantId,
            email: email,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the status
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      }
      throw error;
    }
  }

  /**
   * Shows a message in the modal
   * @param {HTMLElement} messageDiv - The message container
   * @param {string} message - The message text
   * @param {string} type - The message type ('success' or 'error')
   */
  showMessage(messageDiv, message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `notify-me-form__message notify-me-form__message--${type}`;
    messageDiv.style.display = "block";
  }
}

// Register the custom element
if (!customElements.get("notify-me-component")) {
  customElements.define("notify-me-component", NotifyMeComponent);
}
