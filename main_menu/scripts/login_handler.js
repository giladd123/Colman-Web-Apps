// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function getProfileIfLoggedIn() {
  if (localStorage.getItem("isLoggedIn") != "true") {
    window.location.href = "../login_page/login_page.html";
    return;
  }

  const selectedProfileName = localStorage.getItem("selectedProfileName");
  const selectedProfileImage = localStorage.getItem("selectedProfileImage");

  if (!(selectedProfileName && selectedProfileImage)) {
    window.location.href = "../profiles_page/profiles_page.html";
  }
  return [selectedProfileName, selectedProfileImage];
}

function logout() {
  localStorage.clear();
  window.location.href = "../login_page/login_page.html";
}
