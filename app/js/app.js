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

dove.controller('FilesCtrl', ['$scope', 'Files', function($scope, Files) {
  $scope.downloadType = '';

  $scope.$emit('loading+');
  Files.query().then(function(contents) {
    $scope.$emit('loading-');
    $scope.files = contents.files;
  }, function(err) {
    console.log('err', err);
  });

  $scope.selection = {
    files: [],
    size: 0,
  };

  $scope.$on('check:up', function() {
    function process(file) {
      if (file.type === 'file' && file.checked) {
        $scope.selection.files.push(file);
        $scope.selection.size += file.size;
      } 
      if (file.type === 'dir') {
        file.children.forEach(process);
      }
    }

    $scope.selection.files = [];
    $scope.selection.size = 0;
    $scope.files.forEach(process);

    if ($scope.selection.files.length > 1) {
      $scope.downloadType = 'all as .zip';
    } else if ($scope.selection.files.length === 1) {
      $scope.downloadType = 'file';
    } else {
      $scope.downloadType = '';
    }
  });

  $scope.downloadSelection = function() {
    var toDownload = $scope.selection.files.filter(function(sel) {
      return sel.type === 'file';
    });
    var url;

    if (toDownload.length > 1) {
      url = '/bulk?';
      url += toDownload.map(function(sel) {
        return 'files=' + sel.path;
      }).join('&');

    } else {
      url = '/download?file=' + toDownload[0].path;
    }

    window.location = url;
  };
}]);

/* Services */

dove.factory('Files', ['$http', function($http) {
  return {
    query: function(path, params) {
      path = '/api/files/' + (path || '');
      return $http.get(path, {
        params: params,
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
        fillChildren(true);
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
        $scope.model.checked = val;
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
          $scope.check();
        }
      };

      function fillChildren(noLimit) {
        if ($scope.full || $scope.loading) return;
        if ($scope.model.type !== 'dir') {
          return;
        }
        $scope.loading = true;
        $scope.$emit('loading+');

        var opts = {};
        if (noLimit) {
          opts.maxDepth = -1;
        }

        Files.query($scope.model.path, opts).then(function(data) {
          $scope.model.children = data.files;
          $scope.model.full = true;
          $scope.loading = false;
          $scope.$emit('loading-');

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
            $scope.$emit('check:up', $scope.model.checked, $scope.model);
          }
        });
      }
    }
  };
}]);

dove.directive('niceSize', [function() {
  return {
    template: '{{niceSize()}}',
    restrict: 'E',
    scope: {
      size: '=',
    },
    controller: function($scope) {
      $scope.niceSize = function() {
        var units = ['', 'KB', 'MB', 'GB', 'TB'];
        var size = $scope.size;
        var unitIndex = 0;

        while (size > 900 && unitIndex < units.length - 1) {
          size /= 1024.0;
          unitIndex++;
        }

        size = Math.round(size * 10) / 10;
        return size + units[unitIndex];
      };
    },
  };
}]);

dove.directive('loadingIndicator', ['$rootScope', function($rootScope) {
  return {
    template: '<div class="loading" ng-class="{show: loading > 0}"></div>',
    restrict: 'E',
    controller: function($scope) {
      $scope.loading = 0;
      $rootScope.$on('loading+', function() {
        $scope.loading++;
      });
      $rootScope.$on('loading-', function() {
        $scope.loading--
        if ($scope.loading < 0) {
          throw new Error('More loading- events than loading+ events.');
        }
      });
    },
  };
}]);
