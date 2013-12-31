'use strict';

// Declare app level module which depends on filters, and services
var dove = angular.module('dove', [
  'ngRoute',
  'ngResource',
]);

dove.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);

    $routeProvider.when('/', {
      templateUrl: '/partials/home.html',
      controller: 'HomeCtrl'
    });
    $routeProvider.when('/files', {
      templateUrl: '/partials/files.html',
      controller: 'FilesCtrl',
    });
    $routeProvider.otherwise({
      redirectTo: '/'
    });
  }
]);


/* Controllers */

dove.controller('HomeCtrl', [function() {}]);

dove.controller('FilesCtrl', ['$scope', '$q', 'Files', function($scope, $q, Files) {
  Files.query().$promise.then(function(contents) {
    $scope.files = contents.files;
  });

  $scope.selectedFiles = [];

  $scope.$on('check:up', function(e, val, file) {
    var index = $scope.selectedFiles.indexOf(file);
    if (val && index === -1) {
      $scope.selectedFiles.push(file);
    }
    if (!val && index > -1) {
      $scope.selectedFiles.splice(index, 1);
    }
  });
}]);

/* Services */

dove.factory('Files', ['$resource', function($resource) {
  function parseJSON(data) {
    return JSON.parse(data);
  }

  return $resource('/api/files/', {}, {
    query: {
      method: 'GET',
      isArray: false,
      transformResponse: [parseJSON],
    },
  });
}]);

// Helper to make a recursive directives possible.
// From http://stackoverflow.com/a/18609594
dove.factory('RecursionHelper', ['$compile', function($compile){
  var RecursionHelper = {
    compile: function(element){
      var contents = element.contents().remove();
      var compiledContents;
      return function(scope, element){
        if(!compiledContents){
          compiledContents = $compile(contents);
        }
        compiledContents(scope, function(clone){
          element.append(clone);
        });
      };
    }
  };

  return RecursionHelper;
}]);


/* Directives */

dove.directive('fileTree', ['RecursionHelper', function(RecursionHelper) {
  return {
    templateUrl: '/partials/fileTree.html',
    restrict: 'E',
    scope: {
      model: '=',
      parent: '=',
    },
    compile: RecursionHelper.compile,
  };
}]);

dove.directive('file', ['RecursionHelper', function(RecursionHelper) {
  return {
    templateUrl: '/partials/file.html',
    restrict: 'E',
    scope: {
      model: '=',
      parent: '=',
    },
    compile: RecursionHelper.compile,
    controller: function($scope) {
      if ($scope.model.children === undefined) {
        $scope.model.children = [];
      }

      $scope.model.children.forEach(function(child) {
        child.parent = $scope.model;
      });

      if ($scope.model.type === 'dir') {
        $scope.fontAwesomeClass = 'fa-folder-open-o';
      } else {
        $scope.fontAwesomeClass = 'fa-file-o';
      }

      $scope.model.checked = false;

      $scope.check = function() {
        $scope.model.checked = !$scope.model.checked;
        $scope.$broadcast('check:down', $scope.model.checked, $scope.model);
        $scope.$emit('check:up', $scope.model.checked, $scope.model);
      };

      $scope.faded = function() {
        var someUnchecked = false;
        $scope.model.children.forEach(function(child) {
          if (!child.checked) {
            someUnchecked = true;
          }
        });
        return someUnchecked;
      };

      $scope.$on('check:down', function(e, val) {
        if (val !== $scope.model.checked) {
          $scope.model.checked = val;
          $scope.$emit('check:up', val, $scope.model);
        }
      });

      $scope.$on('check:up', function(e, val) {
        var newChecked;

        if (val) {
          newChecked = true;
        } else {
          var found = false;
          $scope.model.children.forEach(function(child) {
            if (child.checked) {
              found = true;
            }
          });
          newChecked = found;
        }

        if (newChecked !== null && newChecked !== $scope.model.checked) {
          $scope.model.checked = newChecked;
          $scope.$emit('check:up', newChecked, $scope.model);
        }
      });
    }
  };
}]);



/*

dove.controller('ProjectListCtrl', ['$scope', 'Api',
  function($scope, Api) {
    $scope.$emit('loading+');
    $scope.projects = [];

    Api.query().$promise.then(function(data) {
      $scope.projects = data.projects;

      $scope.$emit('loading-');
    });
  }
]);

dove.controller('ProjectDetailCtrl', ['$scope', '$routeParams', 'Api',
  function($scope, $routeParams, Api) {
    $scope.$emit('loading+');

    Api.get($routeParams).$promise.then(function(data) {
      $scope.project = data.project;
      $scope.sprints = data.sprints;

      $scope.$emit('loading-');
    });
  }
]);

dove.controller('SprintDetailCtrl', ['$scope', '$routeParams', '$cacheFactory', 'Api',
  function($scope, $routeParams, $cacheFactory, Api) {

    $scope.bugSortBy = {key: 'priority', reverse: false};
    $scope.bugSort = function(bug) {
      var val = bug[$scope.bugSortBy.key];
      if ($scope.bugSortBy.key === 'priority' && val === '--') {
        val = 'P6';
      } else if ($scope.bugSortBy.key === 'assigned_to') {
        val = val.real_name;
      }
      return val;
    };

    $scope.refresh = function() {
      var sprint = $scope.sprint;
      var proj = sprint.project;
      if (!sprint || !proj) {
        return;
      }
      var url = '/api/project/' + proj.slug + '/' + sprint.slug;
      $cacheFactory.get('$http').remove(url);
      return getData();
    };

    $scope.$on('login', function() { $scope.refresh(); });
    $scope.$on('logout', function() { $scope.refresh(); });

    function getData() {
      $scope.$emit('loading+');

      var p = Api.get($routeParams).$promise.then(function(data) {
        $scope.$emit('loading-');

        $scope.bugs = data.bugs;
        $scope.bugs_with_no_points = data.bugs_with_no_points;
        $scope.latest_change_time = data.latest_change_time;
        $scope.prev_sprint = data.prev_sprint;
        $scope.sprint = data.sprint;
        $scope.next_sprint = data.next_sprint;
        $scope.total_bugs = data.total_bugs;
        $scope.closed_bugs = data.closed_bugs;
        $scope.total_points = data.total_points;
        $scope.closed_points = data.closed_points;
        $scope.priority_breakdown = data.priority_breakdown;
        $scope.last_load = new Date();

        if ($scope.bugs_with_no_points > 0) {
          $scope.completionState = 'notready';
        } else if ($scope.closed_points === $scope.total_points) {
          $scope.completionState = 'done';
        } else if ($scope.closed_points > $scope.total_points / 2) {
          $scope.completionState = 'almost';
        } else {
          $scope.completionState = 'incomplete';
        }
      });
      return p;
    }

    getData();
  }
]);

dove.controller('AuthCtrl', ['$rootScope', '$scope', '$cookies', '$http',
  function($rootScope, $scope, $cookies, $http) {
    $scope.creds = {login: '', password: ''};
    $scope.loggingIn = false;

    if ($cookies.username) {
      // This has quotes around it, for some reason, remove it.
      $scope.creds.login = $cookies.username.slice(1, -1);
    }

    $scope.login = function() {
      $http.post('/api/login', $scope.creds)
        .success(function() {
          $scope.creds.password = null;
          $rootScope.$broadcast('login', $scope.creds.login);
        })
        .error(function(err) {
          console.log(err);
        });
    };

    $scope.logout = function() {
      $http.post('/api/logout')
        .success(function() {
          $rootScope.$broadcast('logout');
        });
    };

    $scope.loggedIn = function() {
      return !!$cookies.username;
    };
  }
]);

dove.controller('LoadingCtrl', ['$rootScope', '$scope',
  function($rootScope, $scope) {
    $scope.loading = 0;

    $rootScope.$on('loading+', function() {
      $scope.loading++;
    });
    $rootScope.$on('loading-', function() {
      $scope.loading--;
      if ($scope.loading < 0) {
        throw new Error('More loading- events than loading+ events.');
      }
    });
  }
]);

// Directives

dove.directive('appVersion', ['version',
  function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }
]);

// Servicesk

dove.factory('Api', ['$resource',
  function($resource) {

    function parseJSON(data, headersGetter) {
      return JSON.parse(data);
    }

    function bugUrl() {
      return 'https://bugzilla.mozilla.org/show_bug.cgi?id=' + this.id;
    }

    function augmentProject(proj) {
      proj.url = '/project/' + proj.slug;
      return proj;
    }

    function augmentSprint(project, sprint) {
      sprint.project = project;
      sprint.url = '/project/' + project.slug + '/' + sprint.slug;
      return sprint;
    }

    function augmentBug(bug) {
      var baseUrl = 'https://bugzilla.mozilla.org/show_bug.cgi?id=';
      bug.url = baseUrl + bug.id;
      if (bug.open_blockers) {
        bug.open_blockers = bug.open_blockers.map(function(bugId) {
          return {
            id: bugId,
            url: baseUrl + bugId,
          };
        });
      }
      return bug;
    }

    function augment(data, headersGetter) {
      if (data.projects) {
        data.projects = data.projects.map(augmentProject);
      }
      if (data.project) {
        data.project = augmentProject(data.project);
      }
      if (data.sprints) {
        data.sprints = data.sprints.map(augmentSprint.bind(null, data.project));
      }
      if (data.prev_sprint) {
        data.prev_sprint = augmentSprint(data.project, data.prev_sprint);
      }
      if (data.sprint) {
        data.sprint = augmentSprint(data.project, data.sprint);
      }
      if (data.next_sprint) {
        data.next_sprint = augmentSprint(data.project, data.next_sprint);
      }
      if (data.bugs) {
        data.bugs = data.bugs.map(augmentBug);
      }
      return data;
    }

    return $resource('/api/project/:projSlug/:sprintSlug/', {}, {
      query: {
        method: 'GET',
        isArray: false,
        transformResponse: [parseJSON, augment],
        cache: true
      },
      get: {
        method: 'GET',
        isArray: false,
        transformResponse: [parseJSON, augment],
        cache: true
      },
    });
  }
]);

*/
