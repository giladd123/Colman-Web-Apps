// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function redirectAfterLogin() {
  if (localStorage.getItem("isLoggedIn") != "true") {
    return;
  }
  if (!localStorage.getItem("selectedProfileName")) {
    window.location.href = "../profiles_page/profiles_page.html";
  } else {
    window.location.href = "../main_menu/main_menu.html";
  }
}

function validateEmailOrMobile(emailOrMobileInput, emailOrMobileError) {
  const value = emailOrMobileInput.value.trim();
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const phonePattern = /^\+?[0-9]{8,15}$/;

  if (!emailPattern.test(value) && !phonePattern.test(value)) {
    emailOrMobileError.textContent =
      "Please enter a valid email or mobile number.";
    emailOrMobileError.classList.add("active");
    emailOrMobileInput.classList.add("is-invalid");
    return false;
  } else {
    emailOrMobileError.textContent = "";
    emailOrMobileError.classList.remove("active");
    emailOrMobileInput.classList.remove("is-invalid");
    return true;
  }
}

function validatePassword(passwordInput, passwordError) {
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
