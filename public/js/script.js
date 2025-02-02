// Store current user details
let currentUser = {
    username: '',
    role: ''
  };
  
  // Login Form Submission
  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
  
    if (username.toLowerCase() === 'guest') {
      password = ''; // Ignore password for guest
    }
  
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  
    const result = await response.json();
  
    if (result.success) {
      currentUser.username = username;
      currentUser.role = result.role;
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('main-content').style.display = 'block';
      loadTasks();
      loadChatMessages();
      loadLeaderboard();
  
      // Hide chat form for guest
      if (currentUser.role === 'guest') {
        document.getElementById('chatForm').style.display = 'none';
      }
    } else {
      document.getElementById('login-error').textContent = 'Invalid credentials';
    }
  });
  
  // Logout Button
  document.getElementById('logout-button').addEventListener('click', function () {
    fetch('/logout', { method: 'POST' })
      .then(() => {
        location.reload();
      });
  });
  
  // Load Tasks
  async function loadTasks() {
    const response = await fetch('/tasks');
    const tasks = await response.json();
    renderTasks(tasks);
  }
  
  function renderTasks(tasks) {
    const tasksDiv = document.getElementById('tasks');
    tasksDiv.innerHTML = '';
  
    tasks.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = 'task-item';
  
      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.isCompleted;
  
      // Disable checkbox for guest users or unauthorized unchecking
      if (currentUser.role === 'guest') {
        checkbox.disabled = true;
        checkbox.title = 'Guest users cannot modify tasks.';
      } else if (task.isCompleted && task.checkedBy !== currentUser.username && currentUser.role !== 'admin') {
        checkbox.disabled = true;
        checkbox.title = 'You cannot uncheck this task because you did not complete it.';
      }
  
      // Handle checkbox changes
      checkbox.addEventListener('change', () => {
        updateTaskStatus(task.id, checkbox.checked);
      });
  
      // Task Name
      const taskName = document.createElement('label');
      taskName.textContent = task.name + (task.description ? ` - ${task.description}` : '');
  
      // Checked By
      const checkedBySpan = document.createElement('span');
      if (task.isCompleted && task.checkedBy) {
        checkedBySpan.textContent = `Completed by: ${task.checkedBy}`;
      }
  
      taskItem.appendChild(checkbox);
      taskItem.appendChild(taskName);
      taskItem.appendChild(checkedBySpan);
  
      // Subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        const subtaskButton = document.createElement('button');
        subtaskButton.textContent = 'View Subtasks';
        subtaskButton.addEventListener('click', () => {
          renderSubtasks(taskItem, task.subtasks);
        });
        taskItem.appendChild(subtaskButton);
      }
  
      tasksDiv.appendChild(taskItem);
    });
  }
  
  function renderSubtasks(parentElement, subtasks) {
    const subtaskList = document.createElement('div');
    subtasks.forEach(subtask => {
      const subtaskItem = document.createElement('div');
      subtaskItem.className = 'task-item';
  
      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = subtask.isCompleted;
  
      // Disable checkbox for guest users or unauthorized unchecking
      if (currentUser.role === 'guest') {
        checkbox.disabled = true;
        checkbox.title = 'Guest users cannot modify tasks.';
      } else if (subtask.isCompleted && subtask.checkedBy !== currentUser.username && currentUser.role !== 'admin') {
        checkbox.disabled = true;
        checkbox.title = 'You cannot uncheck this subtask because you did not complete it.';
      }
  
      // Handle checkbox changes
      checkbox.addEventListener('change', () => {
        updateSubtaskStatus(subtask.id, checkbox.checked);
      });
  
      // Subtask Name
      const subtaskName = document.createElement('label');
      subtaskName.textContent = subtask.name;
  
      // Checked By
      const checkedBySpan = document.createElement('span');
      if (subtask.isCompleted && subtask.checkedBy) {
        checkedBySpan.textContent = `Completed by: ${subtask.checkedBy}`;
      }
  
      subtaskItem.appendChild(checkbox);
      subtaskItem.appendChild(subtaskName);
      subtaskItem.appendChild(checkedBySpan);
  
      subtaskList.appendChild(subtaskItem);
    });
  
    parentElement.appendChild(subtaskList);
  }
  
  // Update Task Status
  function updateTaskStatus(taskId, isCompleted) {
    fetch('/update-task-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskId, isCompleted })
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          alert(data.message);
          loadTasks();
        }
      })
      .catch(error => console.error('Error:', error));
  }
  
  // Update Subtask Status (implement similar to updateTaskStatus)
  // Note: Ensure you have a server endpoint to handle subtask updates
  
  // Load Chat Messages
  async function loadChatMessages() {
    const response = await fetch('/chats');
    const messages = await response.json();
    renderChatMessages(messages);
  }
  
  function renderChatMessages(messages) {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.innerHTML = '';
  
    messages.forEach(message => {
      const messageDiv = document.createElement('div');
      messageDiv.textContent = `[${message.timestamp}] ${message.username}: ${message.text}`;
      chatMessagesDiv.appendChild(messageDiv);
    });
  
    // Scroll to bottom
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
  
  // Send Chat Message
  document.getElementById('chatForm').addEventListener('submit', function (e) {
    e.preventDefault();
  
    // Prevent guests from sending messages
    if (currentUser.role === 'guest') {
      alert('Guest users cannot send messages.');
      return;
    }
  
    const message = document.getElementById('chatMessage').value;
  
    fetch('/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          document.getElementById('chatMessage').value = '';
          loadChatMessages();
        }
      });
  });
  
  // Load Leaderboard
  async function loadLeaderboard() {
    const response = await fetch('/leaderboard');
    const leaderboard = await response.json();
    renderLeaderboard(leaderboard);
  }
  
  function renderLeaderboard(data) {
    const leaderboardDiv = document.getElementById('leaderboard-content');
    leaderboardDiv.innerHTML = '';
  
    // Display Monthly Leaderboard
    const monthlyHeader = document.createElement('h3');
    monthlyHeader.textContent = 'Monthly Leaderboard';
    leaderboardDiv.appendChild(monthlyHeader);
  
    const monthlyList = document.createElement('ul');
    data.monthly.forEach(entry => {
      const listItem = document.createElement('li');
      listItem.textContent = `${entry.username}: ${entry.score}`;
      monthlyList.appendChild(listItem);
    });
    leaderboardDiv.appendChild(monthlyList);
  
    // Display Yearly Leaderboard
    const yearlyHeader = document.createElement('h3');
    yearlyHeader.textContent = 'Yearly Leaderboard';
    leaderboardDiv.appendChild(yearlyHeader);
  
    const yearlyList = document.createElement('ul');
    data.yearly.forEach(entry => {
      const listItem = document.createElement('li');
      listItem.textContent = `${entry.username}: ${entry.score}`;
      yearlyList.appendChild(listItem);
    });
    leaderboardDiv.appendChild(yearlyList);
  }
  
  