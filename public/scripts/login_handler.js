function getProfileIfLoggedIn() {
  if (localStorage.getItem("isLoggedIn") != "true") {
    window.location.href = "login";
    return;
  }

  const selectedProfileName = localStorage.getItem("selectedProfileName");
  const selectedProfileImage = localStorage.getItem("selectedProfileImage");

  if (!(selectedProfileName && selectedProfileImage)) {
    window.location.href = "profiles";
  }
  return [selectedProfileName, selectedProfileImage];
}

function logout() {
  localStorage.clear();
  window.location.href = "login";
}
