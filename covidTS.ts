var app = angular.module("covidApp", ["chart.js"]); //['chart.js']);

app.controller("covidCtrl", function($scope) {
    $scope.connected = false;
    $scope.countryList = [];
    $scope.selectedCountry = '';

    $scope.confirmedList = [];
    $scope.deathsList = [];

    $scope.confirmedDeltasList = [];
    $scope.deathsDeltasList = [];

    $scope.confirmedMavgList = [];
    $scope.deathsMavgList = [];

    //for plotting
    let N = 128; // number of days recoreded
    let stepSize = 10;
    $scope.chartLabels = [];//Array.from(Array(N), (_, index) => index + 1);
    var initialDate = new Date("1/22/20");
    for (var i = 0; i < N; i++) {
        if (i % stepSize == 0) {
            $scope.chartLabels.push(initialDate.toLocaleDateString());
        } else {
            $scope.chartLabels.push("");
        }
        initialDate.setDate(initialDate.getDate() + 1);
    }
    

    $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }, { yAxisID: 'y-axis-2' }];
    $scope.chartSeries = ['Confirmed Cases', 'Deaths', '7-Day Moving Average Confirmed Cases'];
    $scope.chartSeriesDeltas = ['Daily Change in Confirmed Cases', 'Daily Change in Deaths'];
    $scope.chartOptions = {  
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            yAxes: [
              {
                id: 'y-axis-1',
                type: 'linear',
                display: true,
                position: 'left'
              },
              {
                id: 'y-axis-2',
                type: 'linear',
                display: true,
                position: 'right'
              }
            ]
          }
    };

    // Handle Websocket Connection
    $scope.onConnectionOpen = function() {
        console.log("Connection open");
        $scope.connected = true;
        $scope.getCountryList();
    };

    $scope.recievedData = function(e) {
        console.log("recieved data! :");
        var d = JSON.parse(e.data)
        console.log(d);
        switch(d['func'][0]) {
            case "get_countries":
                console.log("updating countryList");
                $scope.countryList = d['data'][0];
                break;
            case "get_country":
                var currCountry = d['func'][1];
                var dataType = d['func'][2];
                if (dataType === 'confirmed') {
                    $scope.confirmedList = d['data'][0];
                } else if (dataType === 'deaths') {
                    $scope.deathsList = d['data'][0];
                }
                // update aggregate list of lists for plotting
                if ($scope.confirmedList.length > 0 && $scope.deathsList.length > 0 && $scope.confirmedMavgList.length > 0) {
                    $scope.combinedConfirmedAndDeaths = [$scope.confirmedList, $scope.deathsList, $scope.confirmedMavgList];
                }
                break;
            case "get_deltas":
                var currCountry = d['func'][1];
                var dataType = d['func'][2];
                if (dataType === 'confirmed') {
                    $scope.confirmedDeltasList = d['data'];
                    console.log("confirmed deltas list");
                    console.log($scope.confirmedDeltasList);
                } else if (dataType === 'deaths') {
                    $scope.deathsDeltasList = d['data'];
                    console.log("deaths deltas list");
                    console.log($scope.deathsDeltasList);
                }

                // update aggregate list of lists for plotting
                if ($scope.confirmedDeltasList.length > 0 && $scope.deathsDeltasList.length > 0) {
                    $scope.combinedConfirmedAndDeathsDeltas = [$scope.confirmedDeltasList, $scope.deathsDeltasList];
                }
                break;
            case "get_mavg":
                var currCountry = d['func'][1];
                var dataType = d['func'][2];
                if (dataType === 'confirmed') {
                    $scope.confirmedMavgList = d['data'];
                    console.log("confirmed mavg list");
                    console.log($scope.confirmedMavgList);
                } else if (dataType === 'deaths') {
                    $scope.deathsMavgList = d['data'];
                    console.log("deaths mavg list");
                    console.log($scope.deathsMavgList);
                }

                // update aggregate list of lists for plotting
                if ($scope.confirmedList.length > 0 && $scope.deathsList.length > 0 && $scope.confirmedMavgList.length > 0) {
                    $scope.combinedConfirmedAndDeaths = [$scope.confirmedList, $scope.deathsList, $scope.confirmedMavgList];
                }
                break;

        }
        
        // update all variable bindings
        $scope.$digest();
    };
    $scope.onConnectionClose = function() {
        $scope.connected = false;
    };

    $scope.sendData = function(data: string) {
        if($scope.socket) {
            console.log("sending data: " + data);
            $scope.socket.send(data);
        }
    }

    $scope.startSocket = function () {
        if ("WebSocket" in window) {
            console.log('starting websocket...');
            $scope.socket = new WebSocket("ws://localhost:5420");
            $scope.socket.binaryType = 'arraybuffer';
            $scope.socket.onopen = $scope.onConnectionOpen;
            $scope.socket.onmessage = $scope.recievedData;
            $scope.socket.onclose = $scope.onConnectionClose;
        } else {
            alert("WebSockets are not supported by your browser.");
        }
    }

    $scope.getCountryList = function() {
        if ($scope.connected) {
            console.log("getting country list");
            $scope.sendData('get_cols()');
        } else {
            console.log('not connected');
        }
    }

    // for selection panel: When country selected, retrieve all data to make plots
    $scope.countryChanged = function() {
        console.log("country changed: " + $scope.selectedCountry);
        $scope.sendData('get_country[`' + $scope.selectedCountry +';`confirmed];');
        $scope.sendData('get_country[`' + $scope.selectedCountry +';`deaths];');

        $scope.sendData('get_deltas[`' + $scope.selectedCountry +';`confirmed];');
        $scope.sendData('get_deltas[`' + $scope.selectedCountry +';`deaths];');

        $scope.sendData('get_mavg[`' + $scope.selectedCountry +';`confirmed;7];');
    }
    
    //start socket connection on application load
    $scope.startSocket();

});