import { generateResponse } from './ai.js';

let map3DElement = null;
let currentStep = 1;
    const formValues = {};
    let finalItinerary;
    let homepage3dMap;
    let currentDayStep3D = 1;
    let currentStep3D = 0;
    let poiInvisible3D = true;
    let destinationEntered;
    let daysEntered = "5";
    let dayKeys;
    let currentActivity;
    let currentDayIndex = 0;
    let currentActivityIndex = 0;
    let gallery = document.getElementById("gallery");
    let expandedImageDiv = document.getElementById("expanded-image");
    let attributionLabel;
    let directionLine = null;
    let tempMarker = null;
    let cityBounds = null;
    let cityLat = 0;
    let cityLng = 0;
    const daysColors = ["red", "blue", "green", "orange", "purple", "cyan", "magenta"];
  
    const askGemini = async (_city, _duration) => {
      const reply = await generateResponse(_city, _duration);
      console.log("Gemini says:", reply);
      return reply;
    };
  
      function startTour() {
        // Hide Instructions and start container
        document.getElementById('start-container').style.display = 'none';
        document.getElementById('instructions-container').style.display = 'none';
  
        // Show steps container
        document.querySelector('.steps-container').style.display = 'block';
      }
  
      function moveToStep(step) {
        // Hide current step
        document.getElementById(`step-${currentStep}`).classList.remove('active');
        document.getElementById(`step-${currentStep}`).classList.add('inactive');
  
        // Show the next step
        document.getElementById(`step-${step}`).classList.remove('inactive');
        document.getElementById(`step-${step}`).classList.add('active');
  
        currentStep = step; // Update current step
  
        if (step === 3)
          displayPrompt();
      }
  
      function storeDestinationAndMove() {
        console.log('storeDestinationAndMove');
        destinationEntered = document.getElementById('destination').value;
        if (destinationEntered.trim() !== "") {
          flyCameraToHomepage(destinationEntered.trim());
          moveToStep(2);
        }
      }
  
      function daySlideTo(value) {
  
        document.getElementById("day-slider").value = value;
        updateSliderLabel(value);
      }
  
      function updateSliderLabel(value) {
  
        const label = document.getElementById("slider-value");
        switch (value) {
          case "1": {
            label.textContent = "Less Than 5 Days";
            daysEntered = "<5";
            break;
          } case "2": {
            label.textContent = "5 Days";
            daysEntered = "5";
            break;
          } case "3": {
            label.textContent = "More Than 5 Days";
            daysEntered = ">5";
            break;
          } default: {
            label.textContent = "Invalid Selection";
            daysEntered = "5";
          }
        }
      }
  
      function displayPrompt() {
        document.getElementById('itinerary-prompt').innerHTML = `Are you ready for a virtual 3D tour to <span class="font-bold">${destinationEntered}</span>?`;
      }
  
      function transformObject(object1) {
  
        console.log('transformObject: ', object1);
        const emptyTemplate = {
          activity: "",
          displayName: "",
          placeId: "",
          formattedAddress: "",
          editorialSummary: "",
          rating: 0,
          photos: [],
          coordinates: {
            lat: 0,
            lng: 0,
            altitude: 100
          },
          elevation: 0,
          viewport: {}
        };
  
        const object2 = {};
  
        for (const key in object1) {
          if (object1.hasOwnProperty(key)) {
            object2[key] = object1[key].map(() => ({ ...emptyTemplate }));
          }
        }
  
        console.log('transformedObject: ', object2);

        return object2;
      }
  
      async function getItinerary() {
        let _duration = '3 days';
        if (daysEntered === "<5") {
          _duration = '3 days';
        } else if (daysEntered === "5") {
          _duration = '5 days';
        } else {
          _duration = '7 days';
        }

        const selectedItinerary =  await askGemini(destinationEntered, _duration);
        return selectedItinerary;
      }
  
      async function prepareItinerary() {
        const itinerary = await getItinerary();
        const newItinerary = transformObject(itinerary);
        console.log('newItinerary BEFORE = ', newItinerary);
  
        for (const day of Object.keys(itinerary)) {
          for (let thisActivityIndex = 0; thisActivityIndex < itinerary[day].length; thisActivityIndex++) {
            const thisActivity = itinerary[day][thisActivityIndex];
  
            try {
              const thisPlace = await searchPlaceByName(thisActivity.displayName);
              const thisLocation = thisPlace.location.toJSON();
              const placeLat = thisLocation.lat;
              const placeLng = thisLocation.lng;
              const elevator = new google.maps.ElevationService();
              let thisPlaceElevation = 0;
  
              await elevator.getElevationForLocations({
                locations: [thisLocation],
              }, (elevatorResults) => {
                console.log('elevatorResults = ', elevatorResults);
                if (elevatorResults && elevatorResults.length && elevatorResults[0] && elevatorResults[0].elevation) {
                  thisPlaceElevation = elevatorResults[0].elevation;
                  console.log('thisPlaceElevation = ', thisPlaceElevation);
                }
              });
  
              const tempActivity = {
                activity: thisPlace.displayName,
                displayName: thisPlace.displayName,
                placeId: thisPlace.id,
                formattedAddress: thisPlace.formattedAddress,
                editorialSummary: thisPlace.editorialSummary,
                rating: thisPlace.rating,
                photos: thisPlace.photos || [],
                coordinates: {
                  lat: placeLat,
                  lng: placeLng,
                  altitude: 100
                },
                elevation: thisPlaceElevation,
                viewport: thisPlace.viewport
              };
  
              newItinerary[day][thisActivityIndex] = tempActivity;
            } catch (error) {
              console.error(`Failed to fetch place details for ${thisActivity.placeId}:`, error);
            }
          }
        }
        return newItinerary;
      }
  
      async function loadActivity(hasDayEnded) {
        const dayKey = dayKeys[currentDayIndex];
        const activities = finalItinerary[dayKey];
        currentActivity = activities[currentActivityIndex];
        document.getElementById('prevStep3D').disabled = currentDayIndex === 0 && currentActivityIndex === 0;
        document.getElementById('nextStep3D').disabled = currentDayIndex >= dayKeys.length - 1 && currentActivityIndex >= activities.length - 1;
        updateItineraryStep3D(hasDayEnded);
        if (currentDayIndex >= dayKeys.length - 1 && currentActivityIndex >= activities.length - 1) {
          setTimeout(() => {
            theEnd();
          }, 6000);
          return;
        }
      }
  
      function generateProgressTracker(totalSteps, activeStep) {
        const trackerContainer = document.getElementById('progressTracker');
        trackerContainer.innerHTML = ''; // Clear any existing content
  
        const tailwindColors = [
          "bg-red-500",     // Red
          "bg-blue-500",    // Blue
          "bg-green-500",   // Green
          "bg-blue-500",    // Blue
          "bg-purple-500",  // Purple
          "bg-cyan-500",    // Cyan
          "bg-pink-500"     // Magenta (closest in Tailwind is pink)
        ];
  
        for (let i = 1; i <= totalSteps; i++) {
          // Create the step circle
          const stepCircle = document.createElement('div');
          stepCircle.className = `w-10 h-10 flex items-center justify-center text-white rounded-full cursor-pointer ${i <= activeStep ? 'bg-blue-600' : 'bg-gray-600'} `;
          stepCircle.textContent = i;
  
          // Add click event to navigate to the specific day
          stepCircle.addEventListener('click', () => {
            navigateToDay(i - 1); // Adjusting index (0-based for day array)
          });
  
          // Create the step container
          const stepContainer = document.createElement('div');
          stepContainer.className = 'flex items-center';
          stepContainer.appendChild(stepCircle);
  
          // Add the line after all but the last circle
          if (i < totalSteps) {
            const stepLine = document.createElement('div');
            stepLine.className = 'w-12 border-t-2 border-gray-400';
            stepContainer.appendChild(stepLine);
          }
  
          trackerContainer.appendChild(stepContainer);
        }
      }
  
      function navigateToDay(dayIndex) {
        // Update the currentDayIndex and reset the activity index
        currentDayIndex = dayIndex;
        currentActivityIndex = 0;
  
        // Load the first activity of the selected day
        loadActivity();
  
        // Update the progress tracker to highlight the selected day
        generateProgressTracker(dayKeys.length, currentDayIndex + 1);
  
        console.log(`Navigated to Day ${dayIndex + 1}`);
      }
  
      async function take3dTour() {
        document.getElementById('home-map-container').style.display = 'none';
        document.getElementById('loading-overlay').style.display = 'flex';
        clearNearbyPlaces();
  
        let timeout = 5000;
  
  
  
        if (daysEntered === "<5") {
          timeout = 10000;
        } else if (daysEntered === "5") {
          timeout = 15000;
        } else {
          timeout = 20000;
        }
  
        let countdown = timeout / 1000;
  
        // Start countdown
        const countdownInterval = setInterval(() => {
          countdown--;
          document.getElementById("countdown").textContent = countdown;
  
          if (countdown <= 0) {
            clearInterval(countdownInterval); // Stop countdown when it reaches 0
          }
        }, 1000);
  
        setTimeout(() => {
          document.getElementById('loading-overlay').style.display = 'none';
        }, timeout);
  
        //Prepare Itinerary based on Destination and Days Chosen
        finalItinerary = await prepareItinerary();
        console.log('finalItinerary = ', finalItinerary);
  
        dayKeys = Object.keys(finalItinerary);
        const dayKey = dayKeys[currentDayIndex];
        const activities = finalItinerary[dayKey];
        currentActivity = activities[currentActivityIndex];
  
        document.getElementById('top-controls').classList.remove('hidden');
        document.getElementById('map-area').classList.remove('hidden');
        document.getElementById('map-controls').classList.remove('hidden');
        document.getElementById('main-container').classList.add('hidden');
  
        const { Map3DElement, Marker3DElement, Polyline3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        map3DElement = new Map3DElement({
          center: currentActivity.coordinates,
          range: 500,
          tilt: 60,
          defaultUIDisabled: false,
          mode: 'HYBRID'
        });
        map3DElement.defaultLabelsDisabled = poiInvisible3D;
        document.getElementById('map-container').appendChild(map3DElement);
  
        map3DElement.addEventListener('gmp-click', async (event) => {
          console.log('CLICKED', event);
          stopFlyCamera();
          document.getElementById('info-box-body').classList.add('hidden');
  
          if (event.placeId) {
            const place = await event.fetchPlace();
            await place.fetchFields({
              fields: ["displayName", "formattedAddress", "location", "photos", "editorialSummary", "rating"],
            });
            if (place.displayName && place.formattedAddress && place.location && place.editorialSummary && place.photos) {
              showPlaceInfo(place);
            }
          }
        });
  
        generateProgressTracker(dayKeys.length, currentDayIndex + 1);
        document.getElementById('prevStep3D').disabled = currentDayIndex === 0 && currentActivityIndex === 0;
        document.getElementById('nextStep3D').disabled = currentDayIndex === dayKeys.length - 1 && currentActivityIndex === activities.length - 1;
        updateItineraryStep3D();
        document.getElementById("togglePoiBtn3D").addEventListener("click", togglePOI3D);
        showInfoPopup();
  
      }
  
      function changeActivity(step) {
        closeTheEndPopup();
        closePopup();
        clearNearbyPlaces();
        let hasDayEnded = false;
        const activities = finalItinerary[dayKeys[currentDayIndex]];
        currentActivityIndex += step;
  
        if (currentActivityIndex < 0) {
          if (currentDayIndex > 0) {
            currentDayIndex--;
            currentActivityIndex = finalItinerary[dayKeys[currentDayIndex]].length - 1;
          }
        } else if (currentActivityIndex >= activities.length) {
          if (currentDayIndex < dayKeys.length - 1) {
            console.log(`End of Day - ${currentDayIndex + 1}`);
            hasDayEnded = true;
            currentDayIndex++;
            currentActivityIndex = 0;
          }
        }
        generateProgressTracker(dayKeys.length, currentDayIndex + 1);
        loadActivity(hasDayEnded);
      }
  
      async function updateItineraryStep3D(hasDayEnded = false) {
        document.getElementById('display-area').classList.remove('hidden');
        document.getElementById('info-box').style.display = 'block';
        const flyToCamera = {
          center: currentActivity.coordinates,
          tilt: 25,
          range: (currentActivity.elevation * 10)
        };
  
        map3DElement.flyCameraTo({
          endCamera: flyToCamera,
          durationMillis: 5000,
        });
  
        map3DElement.addEventListener('gmp-animationend', () => {
          map3DElement.flyCameraAround({
            camera: flyToCamera,
            durationMillis: 50000,
            rounds: 1
          });
        }, { once: true });
  
        drawMarkers();
        drawClosedPolylinesForDays();
  
        map3DElement.addEventListener('gmp-click', async (event) => {
          console.log('CLICKED', event);
          stopFlyCamera();
          document.getElementById('info-box-body').classList.add('hidden');
  
          if (event.placeId) {
            const place = await event.fetchPlace();
            await place.fetchFields({
              fields: ["displayName", "formattedAddress", "location", "photos", "editorialSummary", "rating"],
            });
            if (place.displayName && place.formattedAddress && place.location && place.editorialSummary && place.photos) {
              showPlaceInfo(place);
            }
          }
        });
  
        if (hasDayEnded) {
          //display hotels for night stay
          console.log('Display hotels for night stay');
          document.getElementById('info-box-body').classList.add('hidden');
          const hotel = await returnNearbyHotel(currentActivity.coordinates.lat, currentActivity.coordinates.lng);
          if (hotel && hotel.displayName && hotel.formattedAddress && hotel.location && hotel.editorialSummary && hotel.photos) {
            showHotelInfo(hotel);
          }
        }
  
  
        displayPlaceDetails(currentActivity);
        document.getElementById("info-box").style.display = "block";
        document.getElementById("info-box-content-header-1").innerText = `Day-${currentDayIndex + 1}`;
        document.getElementById("info-box-content-header-2").innerText = `(Activity-${currentActivityIndex + 1})`;
        document.getElementById("currentStep3DLabelDay").innerText = `Day ${currentDayIndex + 1}`;
        document.getElementById("currentStep3DLabelActivity").innerText = `(Activity ${currentActivityIndex + 1})`;
        document.getElementById("info-box-content").innerText = currentActivity.activity;
      }
  
      async function stopFlyCamera() {
        map3DElement.stopCameraAnimation();
      }
  
      async function drawMarkers() {
        const { PinElement } = await google.maps.importLibrary("marker");
        Object.keys(finalItinerary).forEach(async (day, thisDayIndex) => {
          finalItinerary[day].forEach(async (thisActivity, thisActivityIndex) => {
            const markerColor = daysColors[thisDayIndex % daysColors.length];
  
            const pinBackground = new PinElement({
              background: markerColor,
            });
            const interactiveMarker = new google.maps.maps3d.Marker3DInteractiveElement({
              position: thisActivity.coordinates,
              label: thisActivity.displayName,
              altitudeMode: 'RELATIVE_TO_GROUND',
              extruded: true
            });
            interactiveMarker.append(pinBackground);
            interactiveMarker.addEventListener('gmp-click', (event) => {
              const markerPosition = event.target.position;
              onMarkerClick(thisActivity);
            });
            map3DElement.append(interactiveMarker);
          });
        });
      }
  
      // Function to draw closed polylines for each day's activities with different colors
      async function drawClosedPolylinesForDays() {
        const { PinElement } = await google.maps.importLibrary("marker");
        const colors = ["red", "blue", "green", "orange", "purple", "cyan", "magenta"]; // Different colors for each day
  
        // Loop through each day in the data
        Object.keys(finalItinerary).forEach((day, index) => {
          let coordinates = finalItinerary[day].map(activity => ({
            lat: activity.coordinates.lat,
            lng: activity.coordinates.lng,
            altitude: activity.coordinates.altitude
          }));
  
          // Ensure the path comes back to the starting point
          if (coordinates.length > 1) {
            coordinates.push(coordinates[0]); // Close the loop
          }
  
          // Set the polyline options with a unique color for each day
          const polylineOptions = {
            strokeColor: daysColors[index % daysColors.length], // Cycle through the colors if more than 7 days
            strokeWidth: 8,
            altitudeMode: "CLAMP_TO_GROUND",//ABSOLUTE,CLAMP_TO_GROUND , RELATIVE_TO_GROUND
            extruded: true,
            zIndex: 50
          };
  
          // Create a polyline for the day's activities
          const polyline = new google.maps.maps3d.Polygon3DElement(polylineOptions);
          polyline.outerCoordinates = coordinates;
  
          // Append the polyline to the map
          map3DElement.append(polyline);
  
          const pinScaled = new PinElement({
            scale: 2,
            background: daysColors[index % daysColors.length],
            borderColor: daysColors[index % daysColors.length],
            glyph: `${day}`,
            glyphColor: 'white',
          });
  
          const polygonCenter = calculatePolygonCenter(coordinates);
          const centerMarker = new google.maps.maps3d.Marker3DElement({
            position: polygonCenter,
            label: `DAY`,
            altitudeMode: 'RELATIVE_TO_GROUND',
            extruded: true,
  
          });
          centerMarker.append(pinScaled);
          map3DElement.append(centerMarker);
        });
      }
  
      function calculatePolygonCenter(polygonCoords) {
        let sumLat = 0;
        let sumLng = 0;
  
        for (const coord of polygonCoords) {
          sumLat += coord.lat;
          sumLng += coord.lng;
        }
        const centerLat = sumLat / polygonCoords.length;
        const centerLng = sumLng / polygonCoords.length;
        return { lat: centerLat, lng: centerLng };
      }
  
      function togglePOI3D() {
        closeTheEndPopup();
        poiInvisible3D = !poiInvisible3D;
        map3DElement.defaultLabelsDisabled = poiInvisible3D;
      }
  
      function theEnd() {
        showTheEndPopup();
      }
  
      function showTheEndPopup() {
        document.getElementById('the-end-popup').style.display = 'flex';
      }
  
      function closeTheEndPopup() {
        document.getElementById('the-end-popup').style.display = 'none';
      }
  
      function closeTheEndPopupAndStatOver() {
        document.getElementById('the-end-popup').style.display = 'none';
        location.reload();
      }
  
      function showInfoPopup() {
        document.getElementById('info-popup').style.display = 'flex';
      }
  
      function closeInfoPopup() {
        document.getElementById('info-popup').style.display = 'none';
      }
  
      async function searchPlaceByName(placeName) {
        const { Place } = await google.maps.importLibrary("places");
  
        const request = {
          textQuery: placeName,
          fields: ["id", "displayName", "formattedAddress", "location", "photos", "editorialSummary", "viewport"],
          //includedType: "cultural_landmark",
          //locationRestriction: { lat: countryLat, lng: countryLng },
          locationBias: { lat: cityLat, lng: cityLng },
          language: "en-US",
          maxResultCount: 1,
          region: "us",
          //useStrictTypeFiltering: true,
        };
        //@ts-ignore
        const { places } = await Place.searchByText(request);
        return places[0];
      }
  
      async function fetchPlaceDetails(placeId) {
        const { Place } = await google.maps.importLibrary("places");
        const place = new Place({
          id: placeId,
          requestedLanguage: "en",
        });
        // Call fetchFields, passing the desired data fields.
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "photos", "editorialSummary", "viewport"],
        });
        return place;
      }
  
      // Helper function to create attribution DIV.
      function createAttribution(attribution) {
        attributionLabel = document.createElement("a");
        attributionLabel.classList.add("attribution-label");
        attributionLabel.textContent = attribution[0].displayName;
        attributionLabel.href = attribution[0].uri;
        attributionLabel.target = "_blank;";
        return attributionLabel;
      }
  
      function displayPlaceDetails(currentActivity) {
        document.getElementById('place-name').innerText = currentActivity.displayName;
        document.getElementById('place-address').innerText = currentActivity.formattedAddress;
        document.getElementById('place-summary').innerText = currentActivity.editorialSummary || 'N/A';
  
        (currentActivity.rating ? document.getElementById('place-rating').innerText = currentActivity.rating + ' stars' : document.getElementById('place-rating').innerText = 'N/A')
  
        if (currentActivity.photos) {
          const placePhoto = currentActivity.photos[0];
          document.getElementById('place-photo').src = placePhoto.getURI({ maxHeight: 380 });
  
          const placePhoto2 = currentActivity.photos[1];
          document.getElementById('place-photo-2').src = placePhoto2.getURI({ maxHeight: 380 });
        }
      }
  
  
      function showHotelInfo(hotel) {
        //TODO zoom to hotel and add reviews, possibly 360 view
  
        document.getElementById('popup-title').textContent = `End of the Day: Stay at ${hotel.displayName}`;
        document.getElementById('popup-summary').textContent = hotel.editorialSummary || 'N/A';
        document.getElementById('popup-address').textContent = hotel.formattedAddress;
  
        (hotel.rating ? document.getElementById('popup-rating').innerText = hotel.rating + ' stars' : document.getElementById('popup-rating').innerText = 'N/A')
  
  
        if (hotel.photos) {
          const hotelPhoto = hotel.photos[0];
          document.getElementById('popup-photo').src = hotelPhoto.getURI({ maxHeight: 380 });
        }
  
        document.getElementById('popup').style.display = 'flex';
      }
  
      function showPlaceInfo(place) {
        document.getElementById('popup-title').textContent = place.displayName;
        document.getElementById('popup-summary').textContent = place.editorialSummary || 'N/A';
        document.getElementById('popup-address').textContent = place.formattedAddress;
  
        (place.rating ? document.getElementById('popup-rating').innerText = place.rating + ' stars' : document.getElementById('popup-rating').innerText = 'N/A')
        if (place.photos) {
          const placePhoto = place.photos[0];
          document.getElementById('popup-photo').src = placePhoto.getURI({ maxHeight: 380 });
        }
        document.getElementById('popup').style.display = 'flex';
      }
  
      async function onMarkerClick(thisActivity) {
        document.getElementById('popup-title').textContent = thisActivity.displayName;
        document.getElementById('popup-summary').textContent = thisActivity.editorialSummary || 'N/A';
        document.getElementById('popup-address').textContent = thisActivity.formattedAddress;
  
        (thisActivity.rating ? document.getElementById('popup-rating').innerText = thisActivity.rating + ' stars' : document.getElementById('popup-rating').innerText = 'N/A')
  
        if (thisActivity.photos) {
          const placePhoto = thisActivity.photos[0];
          document.getElementById('popup-photo').src = placePhoto.getURI({ maxHeight: 380 });
        }
        document.getElementById('popup').style.display = 'flex';
      }
  
      // Close popup function
      function closePopup() {
        document.getElementById('popup').style.display = 'none';
      }
  
      async function handleNearbyPlaces(clickedButton, selectedCategory) {
        closeTheEndPopup();
        
        // Get all buttons within the top-controls div.
        const buttons = document.querySelectorAll('#top-controls button');
        
        // Check if the clicked button is already active.
        // We use `clickedButton` directly, which is more efficient.
        const isActive = clickedButton.classList.contains('bg-gray-300');
        
        // Reset all buttons to the inactive state by removing the active class.
        buttons.forEach(button => {
          button.classList.remove('bg-gray-300');
        });
        
        // Toggle the clicked button's state.
        if (!isActive) {
          // If the button was not active, make it active and fetch new data.
          clickedButton.classList.add('bg-gray-300');
          await fetchNearbyPlaces(currentActivity.coordinates.lat, currentActivity.coordinates.lng, selectedCategory);
        } else {
          // If the button was already active, deactivate it and clear the data.
          clearNearbyPlaces();
        }
      }
  
      async function returnNearbyHotel(lat, lng) {
  
        let center = new google.maps.LatLng(lat, lng);
        const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");
  
        const request = {
          fields: ["id", "displayName", "location", "formattedAddress", "editorialSummary", "photos", "rating"],
          locationRestriction: {
            center: center,
            radius: 5000,
          },
          includedPrimaryTypes: ["lodging"],
          maxResultCount: 1,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: "en-US",
          region: "us",
        };
  
        const { places } = await Place.searchNearby(request);
        if (places && places.length) {
          return places[0];
        } else {
          console.log("No Hotels Found");
          return null;
        }
  
      }
  
      async function fetchNearbyPlaces(lat, lng, type = 'restaurant') {
  
        let center = new google.maps.LatLng(lat, lng);
        const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");
  
        const request = {
          fields: ["displayName", "location", "formattedAddress", "editorialSummary", "rating"],
          locationRestriction: {
            center: center,
            radius: 3000,
          },
          includedPrimaryTypes: [type],
          maxResultCount: 3,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: "en-US",
          region: "us",
        };
  
        const { places } = await Place.searchNearby(request);
        if (places.length) {
          displayNearbyPlaces(places, lat, lng);
        } else {
          displayNearbyPlaces(null, lat, lng);
        }
      }
  
      function clearNearbyPlaces() {
        // Reset all buttons to inactive state
        const buttons = document.querySelectorAll('#top-controls button');
        buttons.forEach(button => {
          button.classList.remove('bg-gray-300');
        });
        document.getElementById('info-box').style.display = 'block';
        document.getElementById('nearby-places-container').style.display = 'none';
        document.getElementById('places-list').innerHTML = '';
      }
  
      function haversine_distance(mk1, mk2) {
        var R = 6371.0710; // Radius of the Earth in Km
        var rlat1 = mk1.lat * (Math.PI / 180); // Convert degrees to radians
        var rlat2 = mk2.lat * (Math.PI / 180); // Convert degrees to radians
        var difflat = rlat2 - rlat1; // Radian difference (latitudes)
        var difflon = (mk2.lng - mk1.lng) * (Math.PI / 180); // Radian difference (longitudes)
  
        var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
        return d.toFixed(1);
      }
  
      async function displayNearbyPlaces(places, centerLat, centerLng) {
        const { PinElement } = await google.maps.importLibrary("marker");
        document.getElementById('info-box').style.display = 'none';
        document.getElementById('nearby-places-container').style.display = 'block';
        const placesList = document.getElementById('places-list');
        placesList.innerHTML = '';
  
        if (places && places.length) {
          places.forEach((place) => {
            let loc = place.location.toJSON();
            let placeLat = loc.lat;
            let placeLng = loc.lng;
  
            const centerCords = { lat: centerLat, lng: centerLng };
            const distanceBtw = haversine_distance(centerCords, loc);
  
            const listItem = document.createElement('li');
            listItem.className = 'place';
            listItem.innerHTML = `
            <strong>${place.displayName}</strong><br>
            <span class="text-xs"><strong>Summary:</strong> ${place.editorialSummary || 'N/A'}</span><br>
            <span class="text-xs"><strong>Distance:</strong> ${distanceBtw} km</span><br>
            <span class="text-xs"><strong>Rating:</strong> ${(place.rating ? (place.rating + ' stars') : 'N/A')}</span>`;
            placesList.appendChild(listItem);
  
            listItem.addEventListener("mouseover", () => {
              if (directionLine) {
                directionLine.remove();
                tempMarker.remove();
              }
              console.log('Mouseover Event!!');
  
              const pinBackground = new PinElement({
                background: '#0000FF',
              });
  
              tempMarker = new google.maps.maps3d.Marker3DInteractiveElement({
                position: {
                  lat: placeLat,
                  lng: placeLng,
                  altitude: 100
                },
                label: place.displayName,
                altitudeMode: 'RELATIVE_TO_GROUND',
                extruded: true,
  
              });
              tempMarker.append(pinBackground);
              map3DElement.append(tempMarker);
  
              directionLine = new google.maps.maps3d.Polyline3DElement({
                outerColor: 'blue',
                outerWidth: 1,
                strokeColor: 'blue',
                strokeWidth: 12,
                altitudeMode: "CLAMP_TO_GROUND",
                extruded: true,
                drawsOccludedSegments: true,
                zIndex: 70
              });
  
              directionLine.coordinates = [
                { lat: placeLat, lng: placeLng },
                { lat: centerLat, lng: centerLng }
              ];
              map3DElement.append(directionLine);
            });
  
            listItem.addEventListener("mouseout", () => {
              console.log('Mouseout Event!!');
              if (directionLine) {
  
                directionLine.remove();
                tempMarker.remove();
              }
            });
  
          });
        } else {
          const listItem = document.createElement('li');
          listItem.className = 'place';
          listItem.innerHTML = `<strong class="text-red-400 font-medium">No Results Found!</strong>`;
          placesList.appendChild(listItem);
        }
      }
  
      async function flyCameraToHomepage(destinationText) {
        let geocodeRequest = {
          address: destinationText,
          language: "en-US",
          region: "us",
        };
  
        const geocoder = new google.maps.Geocoder();
  
        await geocoder.geocode(geocodeRequest, (geocodeResults) => {
          const citySuggested = geocodeResults[0];
  
          console.log('citySuggested = ', citySuggested);
          const cityGeometry = citySuggested.geometry;
          const cityPlaceId = citySuggested.place_id;
          cityBounds = cityGeometry.bounds;
          const ne = cityGeometry.viewport.getNorthEast();
          const sw = cityGeometry.viewport.getSouthWest();
          cityLat = cityGeometry.location.lat();
          cityLng = cityGeometry.location.lng();
  
          // Define the polygon coordinates based on bounds
          const countryPolygonCoords = [
            { lat: ne.lat(), lng: sw.lng() }, // Top-left
            { lat: ne.lat(), lng: ne.lng() }, // Top-right
            { lat: sw.lat(), lng: ne.lng() }, // Bottom-right
            { lat: sw.lat(), lng: sw.lng() }, // Bottom-left
            { lat: ne.lat(), lng: sw.lng() }  // Close the loop
          ];
  
          console.log('countryPolygonCoords = ', countryPolygonCoords);
  
          const cityPolygonOptions = {
            strokeColor: 'blue',
            fillColor: 'rgba(0, 0, 255, 0.5)',
            strokeWidth: 4,
            altitudeMode: "CLAMP_TO_GROUND",//ABSOLUTE,CLAMP_TO_GROUND , RELATIVE_TO_GROUND
            extruded: true,
            zIndex: 50
          };
  
          const cityPolygon = new google.maps.maps3d.Polygon3DElement(cityPolygonOptions);
          cityPolygon.outerCoordinates = countryPolygonCoords;
  
          homepage3dMap.append(cityPolygon);
  
          const flyTo = {
            center: { lat: cityLat, lng: cityLng, altitude: 631700 },
  
          };
  
          homepage3dMap.flyCameraTo({
            endCamera: flyTo,
            durationMillis: 5000,
          });
        });
      }
            
async function init() {
    const { Map3DElement } = await google.maps.importLibrary("maps3d");
    
    homepage3dMap = new Map3DElement({
        center: { lat: 51.5167, lng: 9.9167, altitude: 500000 },
        range: 100,
        tilt: 64,
        heading: 180,
        mode: 'HYBRID'
    });
    document.getElementById('home-map-container').append(homepage3dMap);
    const cameraOptions = {
        center: { lat: 51.5167, lng: 9.9167, altitude: 6317000 },
        range: 10000000,
      };

      setTimeout(() => {
        homepage3dMap.flyCameraAround({
          camera: cameraOptions,
          durationMillis: 50000,
          rounds: -1
        });
      }, 1000);

    homepage3dMap.addEventListener('gmp-click', async (event) => {
        event.preventDefault();
        if (event.placeId) {
            const place = await event.fetchPlace();
            await place.fetchFields({ fields: ['*'] });
            
            document.getElementById("placeName").innerHTML = "<b>Name :</b><br>&nbsp;" + place.displayName;
            document.getElementById("placeId").innerHTML = "<b>Id :</b><br>&nbsp;" + place.id;
            document.getElementById("placeType").innerHTML = "<b>Types :<b/>";
            for (const type of place.types) {
                document.getElementById("placeType").innerHTML += "<br>&nbsp;" + type;
            }
            document.getElementById("details").style.display = "block";
        }
    });
}


document.getElementById('info-box-header').addEventListener('click', function () {
    closePopup();
    closeTheEndPopup();
    closeInfoPopup();

    const body = document.getElementById('info-box-body');
    const chevron = document.getElementById('chevron-icon');

    if (body.classList.contains('hidden')) {
      body.classList.remove('hidden');
      setTimeout(() => body.classList.add('expanded'), 10); // Start smooth open
      chevron.innerHTML = '<i class="fas fa-chevron-up text-blue-600 text-xl"></i>'; // Up arrow
      chevron.classList.add('up');
    } else {
      body.classList.remove('expanded');
      setTimeout(() => body.classList.add('hidden'), 300); // Complete close
      chevron.innerHTML = '<i class="fas fa-chevron-down text-blue-600 text-xl"></i>'; // Down arrow
      chevron.classList.remove('up');
    }
  });

//Actions
init();
document.getElementById('startTourBtn').addEventListener('click', function () {
    startTour();
});
document.getElementById('display-area').classList.add('hidden');
document.getElementById('map-controls').classList.add('hidden');
document.getElementById('map-area').classList.add('hidden');
document.getElementById('top-controls').classList.add('hidden');
document.getElementById('storeDestinationAndMove').addEventListener('click', storeDestinationAndMove);

const daySlider = document.getElementById('day-slider');
const sliderValueLabel = document.getElementById('slider-value');
const daySlideTo1Btn = document.getElementById('daySlideTo1');
const daySlideTo2Btn = document.getElementById('daySlideTo2');
const daySlideTo3Btn = document.getElementById('daySlideTo3');

 // Check if all elements exist before adding event listeners.
 if (daySlider && sliderValueLabel && daySlideTo1Btn && daySlideTo2Btn && daySlideTo3Btn) {

  // Set the initial value of the label on page load.
  updateSliderLabel(daySlider.value);

  // Add an 'input' event listener to the slider to update the label in real-time.
  daySlider.addEventListener('input', (event) => {
    updateSliderLabel(event.target.value);
  });

  // Add 'click' event listeners to the buttons.
  // When a button is clicked, it calls slideToDay() with its corresponding value.
  daySlideTo1Btn.addEventListener('click', () => {
    daySlideTo('1');
  });
  daySlideTo2Btn.addEventListener('click', () => {
    daySlideTo('2');
  });
  daySlideTo3Btn.addEventListener('click', () => {
    daySlideTo('3');
  });
}

const moveToStepBtn = document.getElementById('moveToStepBtn');
moveToStepBtn.addEventListener('click', () => {
  moveToStep(3);
});

const take3dTourBtn = document.getElementById('take3dTourBtn');
take3dTourBtn.addEventListener('click', () => {
  take3dTour();
});


const closeButtons = document.querySelectorAll('.closeInfoPopupBtn');
if (closeButtons.length > 0) {
  closeButtons.forEach(button => {
    button.addEventListener('click', closeInfoPopup);
  });
}

const prevStep3DBtn = document.getElementById('prevStep3D');
prevStep3DBtn.addEventListener('click', () => {
  changeActivity(-1);
});

const nextStep3DBtn = document.getElementById('nextStep3D');
nextStep3DBtn.addEventListener('click', () => {
  changeActivity(1);
});


const shoppingBtn = document.getElementById('shopping');
shoppingBtn.addEventListener('click', (event) => {
  handleNearbyPlaces(event.currentTarget, 'shopping_mall');
});
const foodBtn = document.getElementById('food');
foodBtn.addEventListener('click', (event) => {
  handleNearbyPlaces(event.currentTarget,'restaurant');
});
const transportBtn = document.getElementById('transport');
transportBtn.addEventListener('click', (event) => {
  handleNearbyPlaces(event.currentTarget,'bus_station');
});
const bankBtn = document.getElementById('bank');
bankBtn.addEventListener('click', (event) => {
  handleNearbyPlaces(event.currentTarget,'bank');
});

const clearNearbyPlacesBtn = document.getElementById('clearNearbyPlacesBtn');
clearNearbyPlacesBtn.addEventListener('click', () => {
  clearNearbyPlaces();
});


const closePopupBtn = document.getElementById('closePopupBtn');
closePopupBtn.addEventListener('click', () => {
  closePopup();
});


const closeTheEndPopupBtn = document.getElementById('closeTheEndPopupBtn');
closeTheEndPopupBtn.addEventListener('click', () => {
  closeTheEndPopup();
});

const closeTheEndPopupAndStatOverBtn = document.getElementById('closeTheEndPopupAndStatOverBtn');
closeTheEndPopupAndStatOverBtn.addEventListener('click', () => {
  closeTheEndPopupAndStatOver();
});
