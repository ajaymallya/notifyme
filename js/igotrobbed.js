/**
 * Created with JetBrains RubyMine.
 * User: bsundarraj
 * Date: 5/18/13
 * Time: 2:42 PM
 * To change this template use File | Settings | File Templates.
 */
// An example Parse.js Backbone application based on the todo app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses Parse to persist
// the todo items and provide user authentication and sessions.

$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize("Fsj56BTmZZdYctl1eYZ2D8d1RY5zNSkeej6xyuZS",
                   "icMl3nJBNL8PssR9YEKM54JWSlDDrQb01xNKoylR",
                   "sFR4tgWkxhomsGgbEfjsRe0oU1VdYPNoSnpeMXGc");

  // Incident Model
  // ----------

  // This is the transient application state, not persisted on Parse
  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

   // Our basic Incident model has `content`, `order`, and `done` attributes.
  var Incident = Parse.Object.extend("Incident", {
    // Default attributes for the todo.
    defaults: {
      incidentdate: new Date(),
      user: 'ajay',
      location: new Parse.GeoPoint(30, 30)
    },

    // Ensure that each incident created has `content`.
    initialize: function() {
      if (!this.get("content")) {
        this.set({"content": this.defaults.content});
      }
    }
  });

  var IncidentList = Parse.Collection.extend({

    // Reference to this collection's model.
    model: Incident,

    // Filter down the list of all incident items that are finished.
    done: function() {
      return this.filter(function(incident){ return incident.get('location'); });
    },

        // Filter down the list to only incident items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(incident) {
      return incident.get('order');
    }

  });



  // The Application
  // ---------------

  // The main view that lets a user manage their incident items
  var IncidentsView = Parse.View.extend({

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-incident":  "createOnEnter",
      "click #clear-completed": "clearCompleted",
      "click #toggle-all": "toggleAllComplete",
      "click .log-out": "logOut",
      "click ul#filters a": "selectFilter"
    },

    el: ".content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

      _.bindAll(this, 'addOne', 'addAll', 'addSome', 'render', 'toggleAllComplete', 'logOut', 'createOnEnter');

      // Main incident management template
      this.$el.html(_.template($("#manage-incidents-template").html()));

      this.input = this.$("#new-incident");
      this.allCheckbox = this.$("#toggle-all")[0];

      // Create our collection of Todos
      this.incidents = new IncidentList;

      // Setup the query for the collection to look for incidents from the current user
      this.incidents.query = new Parse.Query(Incident);
      this.incidents.query.equalTo("user", Parse.User.current());

      this.incidents.bind('add',     this.addOne);
      this.incidents.bind('reset',   this.addAll);
      this.incidents.bind('all',     this.render);

      // Fetch all the incident items for this user
      this.incidents.fetch();

      state.on("change", this.filter, this);
    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete this;
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      var done = this.incidents.done().length;
      var remaining = this.incidents.remaining().length;

      this.delegateEvents();

      this.allCheckbox.checked = !remaining;
    },

    // Filters the list based on which type of filter is selected
    selectFilter: function(e) {
      var el = $(e.target);
      var filterValue = el.attr("id");
      state.set({filter: filterValue});
      Parse.history.navigate(filterValue);
    },

    filter: function() {
      var filterValue = state.get("filter");
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#" + filterValue).addClass("selected");
      if (filterValue === "all") {
        this.addAll();
      } else if (filterValue === "completed") {
        this.addSome(function(item) { return item.get('done') });
      } else {
        this.addSome(function(item) { return !item.get('done') });
      }
    },

    // Resets the filters to display all incidents
    resetFilters: function() {
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#all").addClass("selected");
      this.addAll();
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(incident) {
      var view = new IncidentView({model: incident});
      this.$("#incident-list").append(view.render().el);
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection, filter) {
      this.$("#incident-list").html("");
      this.incidents.each(this.addOne);
    },

    // Only adds some todos, based on a filtering function that is passed in
    addSome: function(filter) {
      var self = this;
      this.$("#incident-list").html("");
      this.incidents.chain().filter(filter).each(function(item) { self.addOne(item) });
    },

    // If you hit return in the main input field, create new Todo model
    createOnEnter: function(e) {
      var self = this;
      if (e.keyCode != 13) return;

      this.incidents.create({
        content: this.input.val(),
        order:   this.incidents.nextOrder(),
        done:    false,
        user:    Parse.User.current(),
        ACL:     new Parse.ACL(Parse.User.current())
      });

      this.input.val('');
      this.resetFilters();
    },

    // Clear all done todo items, destroying their models.
    clearCompleted: function() {
      _.each(this.incidents.done(), function(incident){ incident.destroy(); });
      return false;
    },

    toggleAllComplete: function () {
      var done = this.allCheckbox.checked;
      this.incidents.each(function (incident) { incident.save({'done': done}); });
    }
  });

  var LogInView = Parse.View.extend({
    events: {
      "submit form.login-form": "logIn",
      "submit form.signup-form": "signUp"
    },

    el: ".content",

    initialize: function() {
      _.bindAll(this, "logIn", "signUp");
      this.render();
    },

    logIn: function(e) {
      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();

      Parse.User.logIn(username, password, {
        success: function(user) {
          new IncidentsView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          this.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },


    signUp: function(e) {
      var self = this;
      var user = new Parse.User();
      user.set("username",this.$("#signup-username").val());
      user.set("password",this.$("#signup-password").val());
      user.set("email",this.$("#signup-email").val());
      if (navigator.geolocation)
      {
//          user.set("location",new Parse.GeoPoint(navigator.geolocation.getCurrentPosition()));
          user.set("location",new Parse.GeoPoint({latitude:47.62201, longitude:-122.3630}));
      }
      else
      {
        user.set("location",new Parse.GeoPoint({latitude:47.62201, longitude:-122.3630}));
      }
      user.set("ACL",new Parse.ACL());

      user.signUp(null, {
        success: function(user) {
          new ManageIncidentsView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(error.message).show();
          this.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login-template").html()));
      this.delegateEvents();
    }
  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#incidentapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      if (Parse.User.current()) {
        new ManageIncidentsView();
      } else {
        new LogInView();
      }
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
    },

    all: function() {
      state.set({ filter: "all" });
    },

    active: function() {
      state.set({ filter: "active" });
    },

    completed: function() {
      state.set({ filter: "completed" });
    }
  });

  var state = new AppState;

  new AppRouter;
  new AppView;
  Parse.history.start();
});
