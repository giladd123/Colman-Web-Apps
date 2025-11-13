async function redirectAfterLogin() {
  const session = await getSession();
  
  if (!session || !session.isAuthenticated) {
      return;
    }
    
    if (!session.selectedProfileName) {
      window.location.href = "/profiles";
    } else {
      window.location.href = "/feed";
    }
  }

// Toggle UI between sign-in and sign-up
function setMode(isSignup) {
  const authTitle = document.getElementById("authTitle");
  const primaryAction = document.getElementById("primaryAction");
  const secondaryText = document.getElementById("secondaryText");

  // show/hide signup-only fields
  const signupOnlyFields = document.querySelectorAll(".signup-only");
  signupOnlyFields.forEach((el) => {
    el.style.display = isSignup ? "block" : "none";
  });

  if (isSignup) {
    authTitle.textContent = "Sign Up";
    primaryAction.textContent = "Create Account";
    secondaryText.innerHTML = "Already have an account? <a href='#' id='secondaryAction'>Sign in now.</a>";
  } else {
    authTitle.textContent = "Sign In";
    primaryAction.textContent = "Sign In";
    secondaryText.innerHTML = "New to Netflix? <a href='#' id='secondaryAction'>Sign up now.</a>";
  }

  // Re-attach secondary action handler
  const newSecondary = document.getElementById("secondaryAction");
  if (newSecondary) {
    newSecondary.addEventListener("click", (e) => {
      e.preventDefault();
      setMode(!isSignup);
    });
  }
}

function isAdminBypass(emailInput, passwordInput) {
  const primaryAction = document.getElementById("primaryAction");
  const isSignupMode = primaryAction
    ? primaryAction.textContent.toLowerCase().includes("create")
    : false;
  if (isSignupMode) return false;
  const emailValue = emailInput?.value.trim();
  const passwordValue = passwordInput?.value.trim();
  return emailValue === "admin" && passwordValue === "admin";
}

function validateEmail(emailInput, emailError) {
  const value = emailInput.value.trim();
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const adminBypass = isAdminBypass(emailInput, document.getElementById("password"));

  if (adminBypass) {
    emailError.textContent = "";
    emailError.classList.remove("active");
    emailInput.classList.remove("is-invalid");
    return true;
  }

  if (!emailPattern.test(value)) {
    emailError.textContent =
      "Please enter a valid email address.";
    emailError.classList.add("active");
    emailInput.classList.add("is-invalid");
    return false;
  } else {
    emailError.textContent = "";
    emailError.classList.remove("active");
    emailInput.classList.remove("is-invalid");
    return true;
  }
}

function validateUsername(usernameInput, usernameError) {
  const value = usernameInput.value.trim();
  // basic rules: non-empty, 3-30 chars, letters/numbers/underscore/dot
  const usernamePattern = /^[A-Za-z0-9_.]{3,30}$/;
  if (!usernamePattern.test(value)) {
    usernameError.textContent = "Username must be 3-30 chars and contain only letters, numbers, underscores or dots.";
    usernameError.classList.add("active");
    usernameInput.classList.add("is-invalid");
    return false;
  }
  usernameError.textContent = "";
  usernameError.classList.remove("active");
  usernameInput.classList.remove("is-invalid");
  return true;
}

function validatePassword(passwordInput, passwordError) {
  const adminBypass = isAdminBypass(document.getElementById("email"), passwordInput);
  if (adminBypass) {
    passwordError.textContent = "";
    passwordError.classList.remove("active");
    passwordInput.classList.remove("is-invalid");
    return true;
  }
  if (passwordInput.value.trim().length < 6) {
    passwordError.textContent = "Password must be at least 6 characters long.";
    passwordError.classList.add("active");
    passwordInput.classList.add("is-invalid");
    return false;
  } else {
    passwordError.textContent = "";
    passwordError.classList.remove("active");
    passwordInput.classList.remove("is-invalid");
    return true;
  }
}

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const generalError = document.getElementById("generalError");

    const isEmailValid = validateEmail(emailInput, emailError);
    const isPasswordValid = validatePassword(passwordInput, passwordError);
    // if in signup mode, validate username as well
    const primaryAction = document.getElementById("primaryAction");
    const isSignup = primaryAction.textContent.toLowerCase().includes("create");
    let isUsernameValid = true;
    let usernameInput;
    let usernameError;
    if (isSignup) {
      usernameInput = document.getElementById("username");
      usernameError = document.getElementById("usernameError");
      if (!usernameInput) {
        isUsernameValid = false;
      } else {
        isUsernameValid = validateUsername(usernameInput, usernameError);
      }
    }
    if (!isEmailValid || !isPasswordValid || !isUsernameValid) {
      return;
    }

    // Clear general error
    if (generalError) {
      generalError.textContent = "";
      generalError.classList.remove("active");
    }

    // Send login request
    try {
      // decide route based on primary action text
      // already computed isSignup above
      const url = isSignup ? "/api/user/create" : "/api/user/login";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'same-origin', // IMPORTANT: Include session cookie
        body: JSON.stringify(
          isSignup
            ? {
              username: usernameInput.value.trim(),
              email: emailInput.value.trim(),
              password: passwordInput.value.trim(),
            }
            : {
              email: emailInput.value.trim(),
              password: passwordInput.value.trim(),
            }
        ),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (generalError) {
          generalError.textContent = errorData.error || "Login failed";
          generalError.classList.add("active");
        }
        return;
      }
      const userData = await response.json();
      
      // Verify we got user data back
      if (userData && userData._id) {
        // Session is now active on server
        // Redirect to appropriate page
        await redirectAfterLogin();
      } else {
        if (generalError) {
          generalError.textContent = "Failed to log in";
          generalError.classList.add("active");
        }
      }
    } catch (error) {
      console.error("Error during login:", error);
      if (generalError) {
        generalError.textContent = "An error occurred. Please try again.";
        generalError.classList.add("active");
      }
    }
  });

// Initial wiring: signup button and secondary link
document.addEventListener("DOMContentLoaded", async function () {
  // Check if already logged in and redirect
  await redirectAfterLogin();
  
  // secondary link (sign up / sign in) handler
  const secondaryAction = document.getElementById("secondaryAction");
  if (secondaryAction) {
    secondaryAction.addEventListener("click", function (e) {
      e.preventDefault();
      // toggle mode based on current primary button text
      const primaryAction = document.getElementById("primaryAction");
      const isCurrentlySignup = primaryAction.textContent.toLowerCase().includes("create");
      setMode(!isCurrentlySignup);
    });
  }
});
