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
  Files.query().then(function(contents) {
    $scope.files = contents.files;
  }, function(err) {
    console.log('err', err);
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

dove.factory('Files', ['$http', function($http) {
  return {
    query: function(path) {
      path = '/api/files/' + (path || '');
      return $http.get(path, {
        params: {hidden: true},
      }).then(function(res) {
        return res.data;
      });
    },
  };
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
    transclude: true,
    restrict: 'E',
    scope: {
      model: '=',
    },
    compile: RecursionHelper.compile,
  };
}]);

dove.directive('file', ['RecursionHelper', '$timeout', 'Files',
function(RecursionHelper, $timeout, Files) {
  return {
    templateUrl: '/partials/file.html',
    restrict: 'E',
    scope: {
      model: '=',
    },
    compile: RecursionHelper.compile,
    controller: function($scope) {
      if ($scope.model.children === undefined) {
        $scope.model.children = [];
      }

      if ($scope.model.children === '...') {
        $scope.model.children = [];
        $scope.model.full = false;
      } else {
        $scope.model.full = true;
      }

      $scope.model.children.forEach(function(child) {
        child.parent = $scope.model;
      });

      if ($scope.model.type === 'dir') {
        if ($scope.model.expanded) {
          $scope.fontAwesomeClass = 'fa-folder-open-o';
        } else {
          $scope.fontAwesomeClass = 'fa-folder-o';
        }
      } else {
        $scope.fontAwesomeClass = 'fa-file-o';
      }

      $scope.fontAwesomeClass = function() {
        if ($scope.model.type === 'dir') {
          if ($scope.model.expanded) {
            return 'fa-folder-open-o';
          } else {
            return 'fa-folder-o';
          }
        } else {
          return 'fa-file-o';
        }
      };

      $scope.model.checked = $scope.model.checked || false;
      $scope.model.expanded = $scope.model.expanded || false;

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

      $scope.expandOrCheck = function() {
        if ($scope.model.type === 'dir') {
          $scope.model.expanded = !$scope.model.expanded;
          if ($scope.model.expanded && !$scope.model.full) {
            fillChildren();
          }
        } else {
          $scope.model.checked = !$scope.model.checked;
        }
      };

      function fillChildren() {
        if ($scope.full) return;
        $scope.loading = true;
        Files.query($scope.model.path).then(function(data) {
          $scope.model.children = data.files;
          $scope.model.full = true;
          $scope.loading = false;

          function checkAll(model) {
            if (model.children === undefined || model.children === '...') {
              return;
            }
            model.children.forEach(function(child) {
              child.checked = true;
              if (child.children) {
                checkAll(child);
              }
            });
          }
          if ($scope.model.checked) {
            checkAll($scope.model);
          }
        });
      }
    }
  };
}]);
