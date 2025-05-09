document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();
  function renderApp() {
    const onInit = app.initialized();
    onInit
      .then(function getClient(_client) {
        window.client = _client;
        client.instance.resize({ height: "300px" });
        client.events.on('app.activated', onAppActivated);
      })
      .catch(handleErr);
  }
};


function handleErr(err = 'None') {
  console.error(`Error occured. Details:`, err);
  jQuery('#lost-connection').removeClass('hide');
  handleWidgetError();
}

let appIparams;

function onAppActivated() {
  client.iparams.get().then(function(data){
      appIparams = data;
      client.db.get('widget_settings').then(
        function(settings){
          if(settings.enabled) {
            getFieldInfo();
          } else {
            handleWidgetDisable();
          }
        },
        function() {
          // when record is not found which means widget was not yet configured
          handleWidgetDisable();
        }
      );
    },
    function(error) {
      handleErr(error);
    }
  );
}

function handleWidgetDisable(){
jQuery('#widget-disabled').removeClass('hide');
jQuery('#details-loader').addClass('hide');
}

function getFieldInfo() {
// show the required field data.
client.data.get("ticket").then (
    function(ticketData) {
      client.request.invoke('getFieldsData', { freshserviceId: ticketData.ticket.display_id })
      .then(
        function(resData) {
          const entityFields = resData.response;
          if (Object.entries(entityFields).length > 0) {
            renderEntityFields(entityFields);
          } else {
            handleFieldsNotConfigured();
          }
        },
        function(error){
          if(error.status === 404) {
            jQuery('#ticket-not-found').removeClass('hide');
            handleWidgetError();
          } else {
            handleErr(error);
          }
        }
      );
    },
    function(error) {
      handleErr(error);
    }
  );
}

// this will render the data in widget, this has to be changed when there is any changes in widget.html
function renderEntityFields(entityFields) {
Object.entries(entityFields).forEach(function(field) {
  jQuery('#fields-list').append('<li><span class="label"><span>'+field[0]+
    '</span><span class="colon">:</span></span>'+
    '<span class="value">'+field[1]+'</span></li>');
});
jQuery('#details-loader, #lost-connection').addClass('hide');
jQuery('#fields-info-container').removeClass('hide');
jQuery('#widget-content').addClass('widget-content-height');
}

function handleWidgetError() {
jQuery('#fields-info-container, #details-loader').addClass('hide');
jQuery('#widget-content').removeClass('widget-content-height');
}

function handleFieldsNotConfigured() {
  jQuery('#fields-not-configured').removeClass('hide');
  jQuery('#details-loader').addClass('hide');
}
