document.addEventListener('DOMContentLoaded', function() {
    let db;
    const request = window.indexedDB.open('ToDoListDB', 1);

    request.onerror = function(event) {
        console.log("Error opening database:", event.target.errorCode);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadTasksFromDB();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('task', 'task', { unique: false });
        objectStore.createIndex('completed', 'completed', { unique: false });
    };

    function addTaskToDB(task) {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const objectStore = transaction.objectStore('tasks');
        const request = objectStore.add({ task: task, completed: false });

        request.onsuccess = function(event) {
            loadTasksFromDB();
        };
    }

    function loadTasksFromDB() {
        const transaction = db.transaction(['tasks'], 'readonly');
        const objectStore = transaction.objectStore('tasks');
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            const tasks = event.target.result;
            displayTasks(tasks);
        };
    }

    function displayTasks(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        tasks.forEach(function(task) {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span ${task.completed ? 'style="text-decoration: line-through;"' : ''}>${task.task}</span>
                <button onclick="deleteTask(${task.id})">Delete</button>
            `;
            taskList.appendChild(li);

            li.addEventListener('click', function() {
                const checkbox = li.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked; // Toggle checkbox
                updateTaskCompletion(task.id, checkbox.checked);
            });
        });

        enableTaskDragging(); // Enable task dragging after loading tasks
    }

    function updateTaskCompletion(id, completed) {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const objectStore = transaction.objectStore('tasks');
        const request = objectStore.get(id);

        request.onsuccess = function(event) {
            const task = event.target.result;
            task.completed = completed;
            const updateRequest = objectStore.put(task);

            updateRequest.onsuccess = function() {
                loadTasksFromDB();
            };
        };
    }

    function deleteTask(id) {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const objectStore = transaction.objectStore('tasks');
        const request = objectStore.delete(id);

        request.onsuccess = function(event) {
            loadTasksFromDB();
        };
    }

    function enableTaskDragging() {
        let dragItem = null;

        function handleTouchStart(e) {
            dragItem = e.target.closest('li');
            if (!dragItem) return;
            e.preventDefault();
        }

        function handleTouchMove(e) {
            if (!dragItem) return;
            e.preventDefault();
            const rect = dragItem.getBoundingClientRect();
            const offsetY = e.touches[0].clientY - rect.top;
            dragItem.style.transform = `translateY(${offsetY}px)`;
        }

        function handleTouchEnd(e) {
            if (!dragItem) return;
            const offsetY = e.changedTouches[0].clientY - dragItem.getBoundingClientRect().top;
            dragItem.style.transform = 'translateY(0)';
            const targetIndex = Math.floor(offsetY / dragItem.offsetHeight);

            const taskList = document.getElementById('taskList');
            const tasks = Array.from(taskList.querySelectorAll('li'));

            const currentIndex = tasks.indexOf(dragItem);
            if (currentIndex !== targetIndex) {
                taskList.insertBefore(dragItem, tasks[targetIndex + (currentIndex < targetIndex ? 1 : 0)]);
            }

            dragItem = null;
        }

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    }

    document.getElementById('todoForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const taskInput = document.getElementById('taskInput');
        const task = taskInput.value.trim();
        if (task !== '') {
            addTaskToDB(task);
            taskInput.value = '';
        }
    });

    document.getElementById('clearAll').addEventListener('click', function() {
        const confirmation = confirm("Are you sure you want to delete everything?");
        if (confirmation) {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const objectStore = transaction.objectStore('tasks');
            const request = objectStore.clear();

            request.onsuccess = function(event) {
                loadTasksFromDB();
            };
        }
    });

    window.deleteTask = deleteTask;
});
