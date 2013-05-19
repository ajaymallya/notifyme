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
      "click .log-out": "logOut",
      "submit form.submitIncident": "postIncident"
    },

    el: ".content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;
      alert("In Incidents View");

      _.bindAll(this,  'logOut', 'postIncident', 'render');

      // Main incident management template
      //this.$el.html(_.template($("#incidents-template").html()));
      this.render();
    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete this;
    },

    render: function() {
      this.$el.html(_.template($("#incidents-template").html()));
      this.delegateEvents();
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    // Filters the list based on which type of filter is selected
    postIncident: function(e) {
      alert('kkk');
    },

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
          new IncidentsView();
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
        new IncidentsView();
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
