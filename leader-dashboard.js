const supabaseUrl = "https://lcppyuhnlfgnnaqmgnfk.supabase.co";
const supabaseKey = "sb_publishable_4b74e2-5QJLSEzVOHO9hvQ_r5KF0_G2";

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

const dashboardMessage = document.getElementById("dashboard-message");
const dashboardContent = document.getElementById("dashboard-content");
const logoutButton = document.getElementById("logout-button");
const addRunnerButton = document.querySelector("#manual-checkin-form button");

async function checkLeaderAccess() {
  dashboardMessage.textContent = "Checking leader access...";

  // Check whether someone is signed in
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getUser();

  if (sessionError || !sessionData.user) {
    dashboardMessage.textContent = "Please sign in to continue.";
    return;
  }

  // Check whether the signed-in user is an approved leader
  const { data: leader, error: leaderError } =
    await supabaseClient
      .from("leaders")
      .select("user_id")
      .eq("user_id", sessionData.user.id)
      .maybeSingle();

  if (leaderError || !leader) {
    dashboardMessage.textContent = "Leader access denied.";
    return;
  }

  // Show the dashboard to approved leaders
  dashboardMessage.textContent = "Leader access confirmed!";
  loadAttendance();
  loadDuplicates();
  dashboardContent.hidden = false;
  logoutButton.hidden = false;
  addRunnerButton.disabled = false;
}

checkLeaderAccess();


logoutButton.addEventListener("click", async function() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    dashboardMessage.textContent = "Unable to sign out. Please try again.";
    return;
  }

  addRunnerButton.disabled = true;
  dashboardContent.hidden = true;
  logoutButton.hidden = true;

  dashboardMessage.textContent = "You have signed out.";

  window.location.href = "leader-login.html";
});


async function loadAttendance() {
  const attendanceMessage =
    document.getElementById("attendance-message");

  const attendanceList =
    document.getElementById("attendance-list");

  const downloadDate =
    document.getElementById("download-date");

  attendanceMessage.textContent = "Loading attendance...";
  attendanceList.replaceChildren();

  const { data, error } = await supabaseClient
    .from("attendance")
    .select("id, first_name, last_name, session_date, possible_duplicate")
    .order("session_date", { ascending: false });

  if (error) {
    attendanceMessage.textContent =
      "Unable to load attendance.";
    console.error("Attendance error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    attendanceMessage.textContent =
      "No attendance records yet.";
    return;
  }

  attendanceMessage.textContent = "";

  // Remember the currently selected date
  const selectedDate = downloadDate.value || "all";

  // Get unique training dates
  const trainingDates = [
    ...new Set(data.map(function(record) {
      return record.session_date;
    }))
  ];

  // Rebuild the date selector
  downloadDate.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Training Dates";
  downloadDate.appendChild(allOption);

  trainingDates.forEach(function(date) {
    const option = document.createElement("option");

    option.value = date;

    const dateObject = new Date(date + "T12:00:00");

    option.textContent = dateObject.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );

    downloadDate.appendChild(option);
  });

  // Restore the previous selection when possible
  if (
    selectedDate === "all" ||
    trainingDates.includes(selectedDate)
  ) {
    downloadDate.value = selectedDate;
  }

  data.forEach(function(record) {
    const listItem = document.createElement("li");

    const duplicateLabel = record.possible_duplicate
      ? " (Possible duplicate)"
      : "";

    listItem.textContent =
      `${record.first_name} ${record.last_name} — ` +
      `${record.session_date}${duplicateLabel}`;

    attendanceList.appendChild(listItem);
  });
}

async function downloadAttendanceCSV() {
  const downloadDate =
    document.getElementById("download-date");

  const downloadButton =
    document.getElementById("download-button");

  const downloadMessage =
    document.getElementById("download-message");

  const selectedDate = downloadDate.value;

  downloadButton.disabled = true;
  downloadMessage.textContent = "Preparing download...";

  let query = supabaseClient
    .from("attendance")
    .select("first_name, last_name, session_date, possible_duplicate")
    .order("session_date", { ascending: false });

  if (selectedDate !== "all") {
    query = query.eq("session_date", selectedDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Download error:", error.message);
    downloadMessage.textContent =
      "Unable to prepare the download.";
    downloadButton.disabled = false;
    return;
  }

  if (!data || data.length === 0) {
    downloadMessage.textContent =
      "There are no attendance records for that selection.";
    downloadButton.disabled = false;
    return;
  }

  const header =
    "First Name,Last Name,Training Date,Possible Duplicate";

  const rows = data.map(function(record) {
    return [
      record.first_name,
      record.last_name,
      record.session_date,
      record.possible_duplicate ? "Yes" : "No"
    ]
      .map(function(value) {
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  const csv =
    [header, ...rows].join("\r\n");

  const blob = new Blob(
    [csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;

  link.download =
    selectedDate === "all"
      ? "frost-toes-attendance-all.csv"
      : `frost-toes-attendance-${selectedDate}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  downloadMessage.textContent =
    "Attendance CSV downloaded.";

  downloadButton.disabled = false;
}

document
  .getElementById("download-button")
  .addEventListener("click", downloadAttendanceCSV);

async function loadDuplicates() {
  const duplicatesMessage =
    document.getElementById("duplicates-message");

  const duplicatesList =
    document.getElementById("duplicates-list");

  duplicatesMessage.textContent = "Loading possible duplicates...";
  duplicatesList.replaceChildren();

  const { data, error } = await supabaseClient
    .from("attendance")
    .select("id, first_name, last_name, session_date")
    .eq("possible_duplicate", true)
    .order("session_date", { ascending: false });

  if (error) {
    duplicatesMessage.textContent =
      "Unable to load possible duplicates.";
    console.error("Duplicate error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    duplicatesMessage.textContent =
      "No possible duplicates to review.";
    return;
  }

  duplicatesMessage.textContent = "";

  data.forEach(function(record) {
    const listItem = document.createElement("li");

    const runnerText = document.createElement("span");

    runnerText.textContent =
      `${record.first_name} ${record.last_name} — ${record.session_date}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete Duplicate";
    deleteButton.dataset.attendanceId = record.id;

    const keepButton = document.createElement("button");
      keepButton.type = "button";
      keepButton.textContent = "Not a Duplicate";
      keepButton.dataset.attendanceId = record.id;

    deleteButton.addEventListener("click", async function() {
      const attendanceId = Number(deleteButton.dataset.attendanceId);

      deleteButton.disabled = true;
      keepButton.disabled = true;
      duplicatesMessage.textContent = "Deleting duplicate...";

      const { data, error } =
        await supabaseClient.functions.invoke("resolve-duplicate", {
          body: {
            attendanceId: attendanceId,
            action: "delete"
          }
        });

      if (error) {
        let message = "Unable to delete duplicate. Please try again.";

        if (error.context?.json) {
          try {
            const response = await error.context.json();

            if (response.error) {
              message = response.error;
            }
          } catch {
            // Keep the general error message
          }
        }

        duplicatesMessage.textContent = message;
        deleteButton.disabled = false;
        keepButton.disabled = false;

        console.error("Delete duplicate error:", error);
        return;
      }

      duplicatesMessage.textContent = data.message;

      await loadAttendance();
      await loadDuplicates();
    });

    keepButton.addEventListener("click", async function() {
      const attendanceId = Number(keepButton.dataset.attendanceId);

      keepButton.disabled = true;
      deleteButton.disabled = true;
      duplicatesMessage.textContent = "Resolving duplicate...";

      const { data, error } =
        await supabaseClient.functions.invoke("resolve-duplicate", {
          body: {
            attendanceId: attendanceId,
            action: "keep"
          }
        });

      if (error) {
        let message = "Unable to resolve duplicate. Please try again.";

        if (error.context?.json) {
          try {
            const response = await error.context.json();

            if (response.error) {
              message = response.error;
            }
          } catch {
            // Keep the general error message
          }
        }

        duplicatesMessage.textContent = message;
        keepButton.disabled = false;
        deleteButton.disabled = false;

        console.error("Resolve duplicate error:", error);
        return;
      }

      duplicatesMessage.textContent = data.message;

      // Refresh both sections of the dashboard
      await loadAttendance();
      await loadDuplicates();
    });

    listItem.appendChild(runnerText);
    listItem.appendChild(deleteButton);
    listItem.appendChild(keepButton);

    duplicatesList.appendChild(listItem);
  });
}


const manualCheckinForm =
  document.getElementById("manual-checkin-form");

const manualCheckinMessage =
  document.getElementById("manual-checkin-message");


manualCheckinForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  // Prevent repeated submissions
  if (addRunnerButton.disabled) {
    return;
  }

  addRunnerButton.disabled = true;

  const firstName =
    document.getElementById("manual-first-name").value.trim();

  const lastName =
    document.getElementById("manual-last-name").value.trim();

  const sessionDate =
    document.getElementById("manual-session-date").value;

  manualCheckinMessage.textContent = "Saving attendance...";

  // Send the runner's information to our Edge Function
  const { data, error } =
    await supabaseClient.functions.invoke("manual-check-in", {
      body: {
        firstName: firstName,
        lastName: lastName,
        sessionDate: sessionDate
      }
    });

  if (error) {
    let message = "Unable to save attendance. Please try again.";

    if (error.context?.json) {
      try {
        const response = await error.context.json();

        if (response.error) {
          message = response.error;
        }
      } catch {
        // Keep the general error message
      }
    }

    manualCheckinMessage.textContent = message;

    console.error("Manual check-in error:", error);
    addRunnerButton.disabled = false;
    return;
  }

  manualCheckinMessage.textContent = data.message;

  // Clear the form after a successful submission
  manualCheckinForm.reset();

  // Refresh the dashboard lists
  loadAttendance();
  loadDuplicates();
  addRunnerButton.disabled = false;
});






