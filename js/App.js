function App()
{
	var mode;
	var items_tabs;
	var tab_header;
	var item;
	var mouse_start_x;
	var mouse_start_y;
	var garden_bounds;
	var long_tap_timer;
	var history_manager;

	const DRAW = 1;
	const PLANTING = 2;

	const LONG_TAP_DURATION = 250;

	mode = PLANTING;

	history_manager = {};
	history_manager.DRAW = 1;
	history_manager.ADD_ITEM = 2;
	history_manager.MOVE_ITEM = 3;

	var cont = document.querySelector("#app");

	var garden = cont.querySelector("#garden");

	garden_bounds = garden.getBoundingClientRect();

	var canvas = garden.querySelector("canvas");
	canvas.width = garden.clientWidth;
	canvas.height = garden.clientHeight;

	var canvas_context = canvas.getContext("2d");

	canvas_context.strokeStyle = "black";
	canvas_context.lineWidth = 3;
	/*canvas_context.lineCap = "round";
	canvas_context.lineJoin = "round";*/

	var ui_cont = cont.querySelector("#ui_cont");

	var draw_button = ui_cont.querySelector("#draw_button");

	var undo_button = ui_cont.querySelector("#undo_button");
	undo_button.disabled = true;

	var save_button = ui_cont.querySelector("#save_button");

	var clean_button = ui_cont.querySelector("#clean_button");

	var items_tabs_cont = ui_cont.querySelector("#items_tabs_cont");
	items_tabs_cont.headers_cont = items_tabs_cont.querySelector("#items_tabs_headers_cont");

	items_tabs = items_tabs_cont.querySelectorAll(".items_tab");

	var tab;

	for (var i = 0; i < items_tabs.length; i++)
	{
		tab = items_tabs[i];

		tab.def_display_state = window.getComputedStyle(tab).display;

		tab.header = items_tabs_cont.headers_cont.children[i];
		tab.header.tab = items_tabs[i];

		if (i != 0)
		{
			tab.style.display = "none";
		}
		tab.addEventListener("touchstart", startDragItem);
		tab.addEventListener("mousedown", startDragItem);
		tab.addEventListener("dragstart", preventBrowserDrag);
	}
	tab_header = items_tabs_cont.headers_cont.children[0];
	tab_header.style.pointerEvents = "none";

	draw_button.addEventListener("click", toggleDrawingMode);

	undo_button.addEventListener("click", undo);

	clean_button.addEventListener("click", clean);

	save_button.addEventListener("click", save);

	garden.addEventListener("touchstart", startDragItem);
	garden.addEventListener("mousedown", startDragItem);

	items_tabs_cont.headers_cont.addEventListener("click", openTab);

	window.addEventListener("resize", updateLayout);

	function toggleDrawingMode(event)
	{
		if (mode == PLANTING)
		{
			mode = DRAW;

			draw_button.innerText = "Done";

			canvas.addEventListener("touchstart", startDraw);
			canvas.addEventListener("mousedown", startDraw);
		}
		else
		{
			mode = PLANTING;

			draw_button.innerText = "Draw";

			canvas.removeEventListener("touchstart", startDraw);
			canvas.removeEventListener("mousedown", startDraw);
		}
	}
	function startDraw(event)
	{
		addHistoryState(canvas_context, history_manager.DRAW);

		canvas_context.beginPath();
		canvas_context.moveTo(event.offsetX ? event.offsetX : event.touches[0].offsetX, event.offsetY ? event.offsetY : event.touches[0].offsetY);

		if (event.type == "mousedown")
		{
			canvas.addEventListener("mousemove", draw);
			window.addEventListener("mouseup", stopDraw);
		}
		else
		{
			canvas.addEventListener("touchmove", draw);
			window.addEventListener("touchend", stopDraw);
		}
		draw(event);
	}
	function draw(event)
	{
		canvas_context.lineTo(event.offsetX ? event.offsetX : event.touches[0].clientX + garden_bounds.x, event.offsetY ? event.offsetY : event.touches[0].clientY + garden_bounds.y);
		canvas_context.stroke();
	}
	function stopDraw(event)
	{
		canvas.removeEventListener("mousemove", draw);
		canvas.removeEventListener("touchmove", draw);
		window.removeEventListener("mouseup", stopDraw);
		window.removeEventListener("touchend", stopDraw);
	}
	function openTab(event)
	{
		tab_header.tab.style.display = "none";

		tab_header.style.pointerEvents = "auto";
		tab_header.classList.remove("plants_tab__active_header");

		tab_header = event.target;

		tab_header.style.pointerEvents = "none";
		tab_header.classList.add("plants_tab__active_header");

		tab_header.tab.style.display = tab_header.tab.def_display_state;
	}
	function preventBrowserDrag(event)
	{
		event.preventDefault();
	}
	function startDragItem(event)
	{
		var image = event.target;

		var image_bounds = image.getBoundingClientRect();

		if (image.parentNode.classList.contains("item") || image.classList.contains("placed_item"))
		{
			if (image.parentNode.classList.contains("item"))
			{
				item = document.createElement("canvas");
				item.width = image_bounds.width * 1.1;
				item.height = image_bounds.height * 1.1;
				item.style.position = "absolute";
				// item.style.pointerEvents = "none";
				item.style.left = image_bounds.x - 1 + "px";
				item.style.top = image_bounds.y - 1 + "px";
				item.style.width = item.width / 1.1 + "px";
				item.style.height = item.height / 1.1 + "px";
				item.classList.add("placed_item");

				item.getContext("2d").drawImage(image, 0, 0, item.width, item.height);

				if (event.type == "mousedown")
				{
					cont.appendChild(item);
				}
				else
				{
					tab_header.tab.scroll_y = tab_header.tab.scrollTop;
				}
				if (mode == DRAW)
				{
					toggleDrawingMode();
				}
			}
			else
			{
				item = image;
			}
			item.def_x = image_bounds.x - 1;
			item.def_y = image_bounds.y - 1;

			item.classList.add("draggable_item");

			if (event.type == "mousedown")
			{
				mouse_start_x = event.clientX;
				mouse_start_y = event.clientY;

				if (image.classList.contains("placed_item"))
				{
					addHistoryState(item, history_manager.MOVE_ITEM);
				}
				window.addEventListener("mousemove", dragItem);
				window.addEventListener("mouseup", placeItem);
			}
			else
			{
				mouse_start_x = event.touches[0].clientX;
				mouse_start_y = event.touches[0].clientY;

				if (image.parentNode.classList.contains("item"))
				{
					long_tap_timer = window.setTimeout(startDragItemAfterDelay, LONG_TAP_DURATION);

					window.addEventListener("touchmove", stopLongTap);
					window.addEventListener("touchend", stopLongTap);
				}
				else
				{
					addHistoryState(item, history_manager.MOVE_ITEM);

					startDragItemAfterDelay();
				}
			}
		}
	}
	function startDragItemAfterDelay()
	{
		if (!item.parentNode)
		{
			cont.appendChild(item);
		}
		tab_header.tab.style.pointerEvents = "none";

		stopLongTap();

		window.addEventListener("touchmove", dragItem);
		window.addEventListener("touchend", placeItem);
	}
	function stopLongTap()
	{
		window.clearTimeout(long_tap_timer);

		window.removeEventListener("touchmove", stopLongTap);
		window.removeEventListener("touchend", stopLongTap);
	}
	function dragItem(event)
	{
		item.style.left = item.def_x + ((event.clientX ? event.clientX : event.touches[0].clientX) - mouse_start_x) + "px";
		item.style.top = item.def_y + ((event.clientY ? event.clientY : event.touches[0].clientY) - mouse_start_y) + "px";

		if (event.touches)
		{
			tab_header.tab.scrollTop = tab_header.tab.scroll_y;
		}
	}
	function placeItem(event)
	{
		if (parseInt(item.style.left, 10) < garden_bounds.width && parseInt(item.style.top, 10) > garden_bounds.y)
		{
			item.style.left = parseInt(item.style.left, 10) - garden_bounds.x - 1 + "px";
			item.style.top = parseInt(item.style.top, 10) - garden_bounds.y - 1 + "px";
			item.classList.remove("draggable_item");

			if (item.parentNode != garden)
			{
				addHistoryState(item, history_manager.ADD_ITEM);
			}
			garden.appendChild(item);
		}
		else
		{
			cont.removeChild(item);

			item = null;
		}
		tab_header.tab.style.pointerEvents = "auto";
		
		window.removeEventListener("mousemove", dragItem);
		window.removeEventListener("touchmove", dragItem);
		window.removeEventListener("mouseup", placeItem);
		window.removeEventListener("touchend", placeItem);
	}
	function addHistoryState(object, command)
	{
		history_manager.state = { object: object, command: command };

		if (command == history_manager.DRAW)
		{
			history_manager.state.image_data = object.getImageData(0, 0, object.canvas.width, object.canvas.height);
		}
		else if (command == history_manager.MOVE_ITEM)
		{
			history_manager.state.style = { left: object.style.left, top: object.style.top };
		}
		undo_button.disabled = false;
	}
	function undo(event)
	{
		if (history_manager.state.command == history_manager.DRAW)
		{
			history_manager.state.object.putImageData(history_manager.state.image_data, 0, 0);
		}
		else if (history_manager.state.command == history_manager.ADD_ITEM)
		{
			history_manager.state.object.parentNode.removeChild(history_manager.state.object);
		}
		else if (history_manager.state.command == history_manager.MOVE_ITEM)
		{
			history_manager.state.object.style.left = history_manager.state.style.left;
			history_manager.state.object.style.top = history_manager.state.style.top;
		}
		history_manager.state = null;

		undo_button.disabled = true;
	}
	function clean(event)
	{
		canvas_context.beginPath();
		canvas_context.clearRect(0, 0, canvas.width, canvas.height);
		canvas_context.closePath();

		var item;

		for (var i = 2; i < garden.children.length; i++)
		{
			item = garden.children[i];

			garden.removeChild(item);

			item = null;

			i--;
		}
		history_manager.state = null;

		undo_button.disabled = true;
	}
	function save(event)
	{
		var draw_canvas = document.createElement("canvas");
		draw_canvas.width = canvas.width;
		draw_canvas.height = canvas.height;

		var draw_canvas_context = draw_canvas.getContext("2d");

		var item;

		for (var i = 0; i < garden.children.length; i++)
		{
			item = garden.children[i];

			draw_canvas_context.drawImage(item, item.style.left == "" ? 0 : parseInt(item.style.left, 10), item.style.top == "" ? 0 : parseInt(item.style.top, 10), item.width, item.height);
		}
		draw_canvas.toBlob(
			function (blob)
			{
				saveAs(blob, "Gardening.png");
			});
	}
	function updateLayout(event)
	{
		garden_bounds = garden.getBoundingClientRect();

		var temp_canvas = canvas.cloneNode();
		temp_canvas.width = canvas.width;
		temp_canvas.height = canvas.height;

		temp_canvas.getContext("2d").drawImage(canvas, 0, 0);

		canvas.width = garden.clientWidth;
		canvas.height = garden.clientHeight;

		canvas_context.strokeStyle = "black";
		canvas_context.lineWidth = 3;

		canvas_context.drawImage(temp_canvas, 0, 0);

		temp_canvas = null;
	}

}
new App();