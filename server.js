const express = require('express');
const fs = require('fs');
const session = require('express-session');
const path = require('path');

const app = express();

// Use the PORT environment variable or default to 3000
const port = process.env.PORT || 3000;

// Your middleware and routes...

// Start the server
app.listen(port, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
  } else {
    console.log(`Server is running on port ${port}`);
  }
});
// Start the server
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please use a different port.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
  

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret
  resave: false,
  saveUninitialized: false
}));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  fs.readFile('./data/users.txt', 'utf8', (err, data) => {
    if (err) throw err;
    const users = data.trim().split('\n');
    let authenticated = false;
    let role = '';
    users.forEach(user => {
      const [userName, userPass, userRole] = user.split(',');
      if (username === userName) {
        if (userName.toLowerCase() === 'guest') {
          // Guest login without password
          authenticated = true;
          role = userRole;
        } else if (password === userPass) {
          authenticated = true;
          role = userRole;
        }
      }
    });
    if (authenticated) {
      req.session.username = username;
      req.session.role = role; // 'admin', 'user', or 'guest'
      res.json({ success: true, role });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.username) {
    return next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// Get tasks
app.get('/tasks', isAuthenticated, (req, res) => {
  fs.readFile('./data/tasks.txt', 'utf8', (err, data) => {
    if (err) throw err;
    const tasks = parseTasks(data);
    res.json(tasks);
  });
});

// Update task status
app.post('/update-task-status', isAuthenticated, (req, res) => {
  const { taskId, isCompleted } = req.body;
  const username = req.session.username;
  const role = req.session.role;

  if (role === 'guest') {
    return res.status(403).json({ message: 'Guest users cannot modify tasks.' });
  }

  fs.readFile('./data/tasks.txt', 'utf8', (err, data) => {
    if (err) throw err;

    let tasks = parseTasks(data);
    let task = tasks.find(t => t.id === taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (isCompleted) {
      // User is checking the task
      task.isCompleted = true;
      task.checkedBy = username;
    } else {
      // User is unchecking the task
      if (task.checkedBy === username || role === 'admin') {
        task.isCompleted = false;
        task.checkedBy = '';
      } else {
        return res.status(403).json({ message: 'Only the user who checked this task can uncheck it.' });
      }
    }

    // Write updated tasks back to the file
    let updatedData = formatTasks(tasks);
    fs.writeFile('./data/tasks.txt', updatedData, (err) => {
      if (err) throw err;
      res.json({ message: 'Task status updated successfully.' });
    });
  });
});

// Get chat messages
app.get('/chats', isAuthenticated, (req, res) => {
  fs.readFile('./data/chats.txt', 'utf8', (err, data) => {
    if (err) throw err;
    const messages = data.trim().split('\n').map(line => {
      const [timestamp, username, text] = line.split('|');
      return { timestamp, username, text };
    });
    res.json(messages);
  });
});

// Post a new chat message
app.post('/chats', isAuthenticated, (req, res) => {
  const message = req.body.message;
  const username = req.session.username;
  const role = req.session.role;

  if (role === 'guest') {
    return res.status(403).json({ message: 'Guest users cannot send messages.' });
  }

  const timestamp = new Date().toISOString();

  const newMessageLine = `${timestamp}|${username}|${message}\n`;

  fs.appendFile('./data/chats.txt', newMessageLine, (err) => {
    if (err) throw err;
    res.json({ success: true });
  });
});

// Get leaderboard
app.get('/leaderboard', isAuthenticated, (req, res) => {
  fs.readFile('./data/leaderboard.txt', 'utf8', (err, data) => {
    if (err) throw err;
    const leaderboard = parseLeaderboard(data);
    res.json(leaderboard);
  });
});

// Helper functions
function parseTasks(data) {
  let tasks = [];
  let lines = data.trim().split('\n');
  lines.forEach(line => {
    let [id, name, description, assignedUser, isCompleted, checkedBy, subtasksStr] = line.split('|');
    let task = {
      id,
      name,
      description,
      assignedUser,
      isCompleted: isCompleted === 'true',
      checkedBy: checkedBy || '',
      subtasks: []
    };

    // Parse subtasks
    if (subtasksStr && subtasksStr.startsWith('Subtasks:')) {
      const subtasksData = subtasksStr.replace('Subtasks:', '').split(';').filter(s => s);
      subtasksData.forEach(sub => {
        const [subId, subName, subAssignedUser, subIsCompleted, subCheckedBy] = sub.split(',');
        task.subtasks.push({
          id: subId,
          name: subName,
          assignedUser: subAssignedUser,
          isCompleted: subIsCompleted === 'true',
          checkedBy: subCheckedBy || ''
        });
      });
    }

    tasks.push(task);
  });
  return tasks;
}

function formatTasks(tasks) {
  let lines = tasks.map(task => {
    let line = `${task.id}|${task.name}|${task.description}|${task.assignedUser}|${task.isCompleted}|${task.checkedBy}|`;

    // Format subtasks
    let subtasksStr = 'Subtasks:';
    task.subtasks.forEach(subtask => {
      subtasksStr += `${subtask.id},${subtask.name},${subtask.assignedUser},${subtask.isCompleted},${subtask.checkedBy};`;
    });
    line += subtasksStr;

    return line;
  });
  return lines.join('\n');
}

function parseLeaderboard(data) {
  const lines = data.trim().split('\n');
  let monthly = [];
  let yearly = [];
  let currentSection = '';

  lines.forEach(line => {
    if (line.startsWith('Month')) {
      currentSection = 'monthly';
      return;
    } else if (line.startsWith('Year')) {
      currentSection = 'yearly';
      return;
    }
    const [period, username, score] = line.split('|');
    if (currentSection === 'monthly') {
      monthly.push({ username, score: parseInt(score) });
    } else if (currentSection === 'yearly') {
      yearly.push({ username, score: parseInt(score) });
    }
  });

  return { monthly, yearly };
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
