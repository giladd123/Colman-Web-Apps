function showLoading(container, msg = "Loading...") {
  container.innerHTML = `
    <div class="w-100 d-flex flex-column align-items-center py-4 text-secondary">
      <div class="spinner-border text-light mb-3" role="status" aria-hidden="true"></div>
      <div>${msg}</div>
    </div>
  `;
}

function showError(container, msg = "Something went wrong.") {
  container.innerHTML = `
    <div class="w-100 d-flex flex-column align-items-center py-4">
      <div class="text-danger mb-2">${msg}</div>
      <button class="btn btn-sm btn-outline-light" id="retryLoadProfiles">Retry</button>
    </div>
  `;
  const retry = document.getElementById("retryLoadProfiles");
  if (retry) retry.onclick = () => loadProfiles();
}

function createProfileElement(document, profile) {
  const profilesContainer = document.querySelector(".profiles");

  const profileDiv = document.createElement("div");
  profileDiv.className = "profile";
  profileDiv.setAttribute("role", "group");
  profileDiv.setAttribute("tabindex", "0");
  profileDiv.setAttribute("profileid", profile.name);

  const img = document.createElement("img");
  img.src = profile.image || profile.avatar || "/images/profiles/green.png";
  img.alt = profile.name;

  const profileNameDiv = document.createElement("div");
  profileNameDiv.className = "profile-name";

  const input = document.createElement("input");
  input.type = "text";
  input.value = profile.name;
  input.disabled = true;

  const controls = document.createElement("div");
  controls.className = "mt-2 d-flex justify-content-center gap-2";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn btn-sm btn-outline-light";
  editBtn.textContent = "Edit";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-sm btn-danger";
  saveBtn.textContent = "Save";
  saveBtn.style.display = "none";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn-sm btn-outline-danger";
  deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';

  function setEditing(editing) {
    input.disabled = !editing;
    editBtn.style.display = editing ? "none" : "";
    saveBtn.style.display = editing ? "" : "none";
    if (editing) input.focus();
  }

  editBtn.addEventListener("click", () => setEditing(true));

  saveBtn.addEventListener("click", async () => {
    const profileId = profileDiv.getAttribute("profileid");
    await updateProfileName(profileId, input.value, img, input);
    setEditing(false);
  });

  deleteBtn.addEventListener("click", () =>
    openDeleteConfirm(profileDiv, img, input)
  );

  img.addEventListener("click", () => {
    if (input.disabled) {
      saveProfile(input, img, profileDiv);
    } else {
      openAvatarPicker(img, profileDiv);
    }
  });

  // allow Enter key to select when not editing
  profileDiv.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.disabled) {
      saveProfile(input, img, profileDiv);
    }
  });

  if (profile.id) {
    profileDiv.setAttribute("profileid", profile.id);
  } else if (profile._id) {
    profileDiv.setAttribute("profileid", profile._id);
  }

  profileNameDiv.appendChild(input);
  profileDiv.appendChild(img);
  controls.appendChild(editBtn);
  controls.appendChild(saveBtn);
  controls.appendChild(deleteBtn);
  profileDiv.appendChild(profileNameDiv);
  profileDiv.appendChild(controls);
  profilesContainer.appendChild(profileDiv);
}

function openDeleteConfirm(profileDiv, imgEl, inputEl) {
  const id = profileDiv.getAttribute("profileid");
  const name = inputEl.value;
  const thumb = imgEl.src;

  const modalEl = document.getElementById("deleteProfileConfirmModal");
  document.getElementById("deleteProfileName").textContent = name;
  document.getElementById("deleteProfileThumb").src = thumb;

  const confirmBtn = document.getElementById("deleteProfileConfirmBtn");
  confirmBtn.onclick = null; // ensure no duplicates from previous opens
  confirmBtn.onclick = async () => {
    await deleteProfile(id);
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
  };

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function deleteProfile(profileId) {
  try {
    const res = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete profile");
  } catch (e) {
    console.error(e);
  }
  await loadProfiles();
}

function createAddProfileTile(container) {
  const tile = document.createElement("div");
  tile.className = "profile add-profile";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "add-tile image-preview--square";
  button.innerHTML = '<i class="bi bi-plus-lg"></i>';
  button.addEventListener("click", () => openAvatarPickerForCreate(tile));

  tile.appendChild(button);
  container.appendChild(tile);
}

function showNewProfileEditor(tile, selectedUrl, file) {
  tile.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "new-profile-editor";

  const img = document.createElement("img");
  img.className = "editor-thumb";
  img.src =
    selectedUrl ||
    (file ? URL.createObjectURL(file) : "/images/profiles/white.png");
  img.alt = "New profile avatar";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter profile name";
  input.className = "form-control form-control-sm text-center mt-2";

  const actions = document.createElement("div");
  actions.className = "d-flex justify-content-center gap-2 mt-2";

  const createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "btn btn-sm btn-danger";
  createBtn.textContent = "Create";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-sm btn-outline-light";
  cancelBtn.textContent = "Cancel";

  actions.appendChild(createBtn);
  actions.appendChild(cancelBtn);

  wrapper.appendChild(img);
  wrapper.appendChild(input);
  wrapper.appendChild(actions);
  tile.appendChild(wrapper);

  setTimeout(() => input.focus(), 0);

  cancelBtn.addEventListener("click", () => {
    // revert to plus tile
    tile.innerHTML = "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-tile image-preview--square";
    button.innerHTML = '<i class="bi bi-plus-lg"></i>';
    button.addEventListener("click", () => openAvatarPickerForCreate(tile));
    tile.appendChild(button);
  });

  createBtn.addEventListener("click", async () => {
    const name = (input.value || "").trim();
    if (!name) {
      input.focus();
      return;
    }
    await createNewProfile(name, file, selectedUrl);
  });
}

async function createNewProfile(name, file, selectedUrl) {
  try {
    const userId = localStorage.getItem("userId");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("userId", userId);
    if (!file && selectedUrl) {
      const res = await fetch(selectedUrl);
      const blob = await res.blob();
      file = new File([blob], "avatar.png", { type: blob.type || "image/png" });
    }
    if (file) fd.append("avatar", file);
    const res = await fetch("/api/profiles/create", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Failed to create profile");
  } catch (e) {
    console.error(e);
  }
  await loadProfiles();
}

async function updateProfileName(profileId, newName, imgEl, inputEl) {
  try {
    const fd = new FormData();
    fd.append("name", newName);
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PUT",
      body: fd,
    });
    if (!res.ok) throw new Error("Failed to update name");
    const updated = await res.json();
    inputEl.value = updated.name || newName;
  } catch (e) {
    console.error(e);
  }
}

let avatarPickerState = {
  mode: "update",
  selectedUrl: null,
  file: null,
  targetImg: null,
  targetProfileId: null,
  createTile: null,
};

function openAvatarPicker(targetImg, profileDiv) {
  avatarPickerState = {
    mode: "update",
    selectedUrl: null,
    file: null,
    targetImg,
    targetProfileId: profileDiv.getAttribute("profileid"),
    createTile: null,
  };
  const modalEl = document.getElementById("avatarPickerModal");
  const grid = document.getElementById("avatarPickerGrid");
  const upload = document.getElementById("avatarPickerUpload");
  const previewWrap = document.getElementById("avatarPickerPreview");
  const applyBtn = document.getElementById("avatarPickerApply");

  // render defaults
  grid.innerHTML = "";
  const defaults = [
    "/images/profiles/white.png",
    "/images/profiles/green.png",
    "/images/profiles/pink.png",
    "/images/profiles/purple.png",
    "/images/profiles/yellow.png",
  ];
  defaults.forEach((src) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "default-avatar p-0";
    btn.innerHTML = `<img src="${src}" alt="avatar" />`;
    btn.addEventListener("click", () => {
      avatarPickerState.selectedUrl = src;
      avatarPickerState.file = null;
      upload.value = "";
      previewWrap.innerHTML = `<img src="${src}" class="w-100 h-100 object-fit-cover" />`;
    });
    grid.appendChild(btn);
  });

  upload.onchange = () => {
    const file = upload.files && upload.files[0];
    if (file) {
      avatarPickerState.file = file;
      avatarPickerState.selectedUrl = null;
      const url = URL.createObjectURL(file);
      previewWrap.innerHTML = `<img src="${url}" class="w-100 h-100 object-fit-cover" />`;
    }
  };

  applyBtn.onclick = async () => {
    await applyAvatarSelection();
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
  };

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function openAvatarPickerForCreate(createTile) {
  avatarPickerState = {
    mode: "create",
    selectedUrl: null,
    file: null,
    targetImg: null,
    targetProfileId: null,
    createTile,
  };
  const modalEl = document.getElementById("avatarPickerModal");
  const grid = document.getElementById("avatarPickerGrid");
  const upload = document.getElementById("avatarPickerUpload");
  const previewWrap = document.getElementById("avatarPickerPreview");
  const applyBtn = document.getElementById("avatarPickerApply");

  grid.innerHTML = "";
  const defaults = [
    "/images/profiles/white.png",
    "/images/profiles/green.png",
    "/images/profiles/pink.png",
    "/images/profiles/purple.png",
    "/images/profiles/yellow.png",
  ];
  defaults.forEach((src) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "default-avatar p-0";
    btn.innerHTML = `<img src="${src}" alt="avatar" />`;
    btn.addEventListener("click", () => {
      avatarPickerState.selectedUrl = src;
      avatarPickerState.file = null;
      upload.value = "";
      previewWrap.innerHTML = `<img src="${src}" class="w-100 h-100 object-fit-cover" />`;
    });
    grid.appendChild(btn);
  });

  upload.onchange = () => {
    const file = upload.files && upload.files[0];
    if (file) {
      avatarPickerState.file = file;
      avatarPickerState.selectedUrl = null;
      const url = URL.createObjectURL(file);
      previewWrap.innerHTML = `<img src="${url}" class="w-100 h-100 object-fit-cover" />`;
    }
  };

  applyBtn.onclick = async () => {
    await applyAvatarSelection();
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
  };

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function applyAvatarSelection() {
  const { mode, selectedUrl, file, targetImg, targetProfileId, createTile } =
    avatarPickerState;
  if (mode === "create") {
    if (!selectedUrl && !file) return;
    showNewProfileEditor(createTile, selectedUrl, file);
    return;
  }
  if (!targetProfileId) return;
  try {
    const fd = new FormData();
    if (file) {
      fd.append("avatar", file);
    } else if (selectedUrl) {
      const fetched = await fetch(selectedUrl);
      const blob = await fetched.blob();
      const fauxFile = new File([blob], "avatar.png", {
        type: blob.type || "image/png",
      });
      fd.append("avatar", fauxFile);
    } else {
      return; // nothing selected
    }
    const res = await fetch(`/api/profiles/${targetProfileId}`, {
      method: "PUT",
      body: fd,
    });
    if (!res.ok) throw new Error("Failed to update avatar");
    const updated = await res.json();
    const newSrc = updated.avatar || updated.image_url || targetImg.src;
    targetImg.src = newSrc;
  } catch (e) {
    console.error(e);
  }
}

function saveProfile(input, img) {
  localStorage.setItem("selectedProfileName", input.value);
  localStorage.setItem("selectedProfileImage", img.src);
  if (profileDiv) {
    const profileId = profileDiv.getAttribute("profileid");
    if (profileId) {
      localStorage.setItem("selectedProfileId", profileId);
    }
  }
  window.location.href = "feed";
}

// fetch profiles from server for current user and render them
async function loadProfiles() {
  const profilesContainer = document.querySelector(".profiles");
  showLoading(profilesContainer, "Loading profiles...");
  const userId = localStorage.getItem("userId");
  if (!userId) {
    profilesContainer.innerHTML =
      '<div class="text-secondary py-4">No user selected.</div>';
    return;
  }

  try {
    const res = await fetch(`/api/profiles/user/${userId}`);
    if (!res.ok) {
      showError(profilesContainer, "Failed to load profiles.");
      return;
    }
    const profiles = await res.json();
    if (!Array.isArray(profiles)) {
      showError(profilesContainer, "Failed to load profiles.");
      return;
    }

    // clear and dynamically render tiles
    profilesContainer.innerHTML = "";

    if (profiles.length === 0) {
      // no profiles yet: show only the add tile
      createAddProfileTile(profilesContainer);
      return;
    }

    profiles.forEach((p) => {
      const profile = {
        name: p.name,
        image: p.avatar || "/images/profiles/green.png",
        id: p._id,
      };
      createProfileElement(document, profile);
    });

    if (profiles.length < 5) {
      createAddProfileTile(profilesContainer);
    }
  } catch (err) {
    console.error("Error loading profiles:", err);
    showError(profilesContainer, "Failed to load profiles.");
  }
}
