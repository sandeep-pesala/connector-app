document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();

  function renderApp() {
    var onInit = app.initialized();

    onInit
      .then(function getClient(_client) {
        window.client = _client;
        client.events.on('app.activated', onAppActivated);
      })
      .catch(handleErr);
  }
};

var appIparams, selectedEntityFields;

async function onAppActivated() {
  // off event so that it won't be attached multiple times during multiple pjax navigation
  client.events.off('app.activated', onAppActivated);

  // For each connector app, one have to create a recipe in freshservice workato account 
  // under the app folder to fetch the fields data
  try {
    appIparams = await client.iparams.get();
    client.db.get('endpointDetails').then(
      function(endpoints){
        if(endpoints.meta_fields_url == null) {
          storeEndpoints();
        }
      },
      function(error){
        storeEndpoints();
        console.log(error);
      });
    renderDashboard();
    bindEvents();
  } catch(error) {
    handleErr(error);
  }

  // Show Quick Help popup first time of user visit
  client.db.get('quickHelpSeen').then(function(){
    // Assume user has seen
  }, function(){
    jQuery('#help-modal-trigger').click();
    client.db.set('quickHelpSeen', {'seen': true});
  });
}

function renderDashboard() {
  fetchToken({type: 'dashboard'});
}


function handleErr(err = 'None') {
  console.log(`Error occured. Details:`, err);
  var message;
  try {
    message = err.message ? JSON.parse(err.message).error : JSON.parse(err.response).message;
    if(!message) throw err;
  } catch(error) {
    console.error(error);
    message = 'Something went wrong. Please try again.';
  }
  document.querySelector('#toaster').trigger({
    type:'error',
    content: message,
    position: 'top-center'
  });
}

// this will get and store the endpoints
async function storeEndpoints() {
  try {
    await client.request.invoke("fetchEndpoints", {context: {}});
  } catch(error) {
    handleErr(error);
  }
}

function handleRecipesStateChange($targerBtn, showStartOrStop, btnData) {
  $targerBtn
  .addClass('hide')
  .siblings('.'+showStartOrStop+'-recipe')
  .removeClass('hide')
  .removeAttr('disabled');
  setKebabMenu(btnData.index, btnData, btnData.key === 'start');
  document.querySelector('#toaster').trigger({
    type:'success',
    content: 'Recipe updated successfully.',
    position: 'top-center'
  });
}

function handleTimoutCase($targerBtn, showStartOrStop, btnData) {
  client.request.invoke("getAllRecipes", appIparams).then(
    function(data) {
      var recipeList = [];
      recipeList = JSON.parse(data.response.response);
      var recipeData = recipeList.find(function(recipe){ return btnData.id == recipe.id; });
      if((showStartOrStop == 'start' && !recipeData.running) || (showStartOrStop == 'stop' && recipeData.running)) {
        handleRecipesStateChange($targerBtn, showStartOrStop, btnData);
      } else {
        $targerBtn.removeAttr('disabled');
        handleErr();
      }
    },
    function(error) {
      $targerBtn.removeAttr('disabled');
      handleErr(error);
    }
  )
}

function bindEvents() {
  jQuery(document).off(".sampleApp");
  jQuery('#tabs-container, fw-toggle, #entity-fields-list').off(".sampleApp");

  jQuery('#tabs-container').on( "fwChange.sampleApp", function( event ) {
    if(event.detail.tabIndex === 1) {
      var $tableContainer = jQuery('#list-table-container');
      if($tableContainer.hasClass('visited')) return;
      $tableContainer.addClass('visited');
      jQuery('#spinner-loader').removeClass('hide');
      client.request.invoke("getAllRecipes", appIparams).then(
        function(data) {
          var recipeList = [];
          recipeList = JSON.parse(data.response.response);
          if(recipeList && recipeList.length) {
            var recipeIds = recipeList.map(function(recipe) {return recipe.id });

            // save recipe to stop while app uninstall
            client.db.set('recipeIds', {'recipe_ids': recipeIds});
            jQuery('#tenant-list-body').empty();
            recipeList.forEach(function(recipe, i){
              jQuery('#tenant-list-body').append(`<tr>
                  <td>${recipe.name}</td>
                  <td>${recipe.description}</td>
                  <td class="action-btns">
                    <fw-button color="secondary" class="preview-recipe show-iframe" data-type="view" data-id="${recipe.id}" data-name="${recipe.name}"> Preview </fw-button>
                    <fw-button color="primary" class="start-recipe ${recipe.running ? 'hide' : ''}" data-id="${recipe.id}" data-name="${recipe.name}" data-index="${i}" data-key="start"> Start </fw-button>
                    <fw-button color="primary" class="stop-recipe ${recipe.running ? '' : 'hide'}" data-id="${recipe.id}" data-name="${recipe.name}" data-index="${i}" data-key="stop"> Stop </fw-button>
                    <fw-kebab-menu id="standard-kebab-menu-${i}"></fw-kebab-menu>
                  </td>
                </tr>`);
                setKebabMenu(i, recipe, recipe.running);
            });
            jQuery('#list-table-container, #recipe-table-info').removeClass('hide');
            jQuery('#spinner-loader').addClass('hide');
          } else {
            jQuery('#no-workflows').removeClass('hide').siblings('.sibling-container').addClass('hide');
          }

        },
        function(error) {
          handleErr(error);
          if([401, 403].includes(error.status)) {
            jQuery('#no-permission').removeClass('hide').siblings().addClass('hide');
          }
        }
      )
    } else if(event.detail.tabIndex === 2) {
      var $widgetSettingsLoaded = jQuery('#settings-container');
      if($widgetSettingsLoaded.hasClass('visited')) return;
      $widgetSettingsLoaded.addClass('visited');
      setWidgetToggle();
      showFields();
    }
  });

  jQuery(document).on('click.sampleapp', '.start-recipe, .stop-recipe', function(e){
    var btnData = e.target.dataset;
    var showStartOrStop = btnData.key == 'start' ? 'stop' : 'start';
    var requestData = jQuery.extend({}, appIparams, {id: btnData.id});
    var $targerBtn = jQuery(e.target);
    $targerBtn.attr('disabled', 'disabled');
    client.request.invoke(btnData.key+"Recipe", requestData).then(
      function() {
        handleRecipesStateChange($targerBtn, showStartOrStop, btnData);
      },
      function(error) {
        // Workato takes more than 8s, but freshworks marketplace app timeout in 5s. so, validating the state after freshworks marketplace app timeout.
        if([408, 502, 504].includes(error.status)) {
          setTimeout(handleTimoutCase($targerBtn, showStartOrStop, btnData), 5000);
        } else {
          $targerBtn.removeAttr('disabled');
          handleErr(error);
        }
      }
    );
  });

  jQuery(document).on('click.sampleapp', '.show-iframe', function(e) {
    handleTenantCrud(jQuery(e.target).data());
  });

  jQuery('fw-toggle').on('fwChange.sampleapp', function(e) {
    e.stopPropagation();
    handleWidgetPreview(e.detail.checked);
  });

  jQuery(document).on('click.sampleapp', '.widget-toggle-btn', function(e) {
    if(jQuery(e.target).hasClass('disabled')) {
      jQuery('#widget-remove-confirm-modal').click();
    } else {
      saveWidgetData(true);
    }
  });

  jQuery(document).on('click.sampleapp', '#turn-off-widget', function() {
    jQuery('.widget-toggle-btn fw-toggle').click();
    saveWidgetData(false);
  });

  jQuery(document).on('click.sampleapp', '#save-fields', function() {
    var selectedFields = [];
    jQuery('#entity-fields-list').find('fw-checkbox[checked]').each(function(){
      var selectedField = $(this).data('value');
      selectedFields.push(selectedField);
    });
    client.db.set('entity_fields', {'fields_list': selectedFields}).then (
      function() {
        selectedEntityFields = selectedFields;
        document.querySelector('#toaster').trigger({
          type:'success',
          content: 'Your recent data sync changes updated successfully.',
          position: 'top-center'
        });
      },
      function(error) {
        document.querySelector('#toaster').trigger({
          type:'error',
          content: 'Your recent data sync changes does not updated, Please refresh this page and try to sync it again.',
          position: 'top-center'
        });
        console.log(error);
      });
    saveWidgetData(jQuery('.widget-toggle-btn fw-toggle')[0].checked);
    // need this api to cache the data in workato side to fix the timeout issue in ticket widget
    client.request.invoke('getFieldsData', {}).then(
      function() {
        console.log('Fields data api cached');
      },
      function(error) {
        console.error(error);
      }
    )
  });

  jQuery(document).on('click.sampleapp', '#reset-fields', function() {
    var fields = jQuery("#entity-fields-list fw-checkbox");
    fields.each(function(index, chkBox) {
        var $field = jQuery(chkBox);
        var fieldValue = jQuery(chkBox).data('value');
        var isPrevStateIsChecked = selectedEntityFields.find(function(sField){ return sField[0] === fieldValue[0]});
        if(isPrevStateIsChecked) {
          !$field[0].checked && $field.attr('checked', 'checked');
        } else {
          $field[0].checked && $field.removeAttr('checked');
        }
    });
  });

}

function saveWidgetData(enableOrDisable){
  client.db.set('widget_settings', {'enabled': enableOrDisable }).then (
    function() {
      console.log('Widget settings saved');
    },
    function(error) {
      handleErr(error)
    });
}

function setKebabMenu(i, recipe, showLog) {
  var standardDataSource = [
    {
      value: {
        type: 'edit',
        id: recipe.id,
        name: recipe.name
      },
      text: 'Edit',
    }
  ];
  if(showLog) {
    standardDataSource.push({
      value: {
        type: 'log',
        id: recipe.id,
        name: recipe.name
      },
      text: 'View log',
    });
  }
  var standardVariant = jQuery('#standard-kebab-menu-'+i);
  standardVariant[0].options = standardDataSource;
  standardVariant.off('fwSelect.sampleapp').on('fwSelect.sampleapp', function(e) {
    handleTenantCrud(e.detail.value);
  });
}

function handleTenantCrud(data) {
  var $tenant = jQuery('#tenant-'+data.type);
  $tenant.find('.recipe-name').text(data.name);
  switch(data.type) {
    case 'view':
      $tenant.removeClass('hide').find('#edit-tenant-btn').data({id: data.id, type: 'edit'});
      jQuery('#list-table-container, #recipe-table-info').addClass('hide');
      break;
    case 'edit':
      jQuery('#tenant-view, #list-table-container, #recipe-table-info').addClass('hide');
      $tenant.removeClass('hide');
      break;
    case 'log':
      jQuery('#tenant-log, #list-table-container, #recipe-table-info').toggleClass('hide');
      break;
  }
  fetchToken(data);
}

function fetchToken(data) {
  var $appIframe = jQuery('#'+data.type+'-iframe');
  $appIframe.attr('src', '');
  client.request.invoke('getJwtToken', appIparams).then(
    function(resData) {
      var response = JSON.parse(resData.response.response);
      switch(data.type) {
        case 'view':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Frecipes%2F${data.id}%23recipe&workato_dl_token=${response.token}`);
          break;
        case 'edit':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Frecipes%2F${data.id}%2Fedit&workato_dl_token=${response.token}`);
          break;
        case 'log':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Frecipes%2F${data.id}%23jobs&workato_dl_token=${response.token}`);
          break;
        case 'dashboard':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Fdashboard%2Fmain&workato_dl_token=${response.token}&folder_id=${appIparams.folder_id}`);
          jQuery('#dashboard-loader').addClass('hide');
          break;
      }
    },
    function(error) {
      handleErr(error);
    }

  );
}

function backToTable(type) {
  jQuery('#tenant-'+type+', #list-table-container, #recipe-table-info').toggleClass('hide');
}

function setWidgetToggle() {
  client.db.get('widget_settings').then (
    function(settings) {
      jQuery('.widget-toggle-btn fw-toggle')[0].checked = settings.enabled;
      handleWidgetPreview(settings.enabled);
      jQuery('.widget-toggle-container, .fields-display-area').removeClass('hide');
    },
    function() {
      jQuery('.widget-toggle-btn fw-toggle')[0].checked = false;
      handleWidgetPreview(false);
      jQuery('.widget-toggle-container, .fields-display-area').removeClass('hide');
    });
}

function handleWidgetPreview(isChecked) {
  jQuery('#widget-shown').toggleClass('hide', !isChecked);
  jQuery('#widget-hidden').toggleClass('hide', isChecked);
  jQuery('.widget-toggle-btn').toggleClass('disabled', isChecked);
}

function showFields() {
  client.db.get('entity_fields').then(
    function(selectedFields){
      selectedEntityFields = selectedFields.fields_list;
      renderEntityFields(entityFields, selectedFields.fields_list);
    },
    function(error){
      if(error.status == '404') {
        selectedEntityFields = [];
        renderEntityFields(entityFields, []);
      } else {
        handleErr(error);
      }
      console.log(error);
    }
  )
}

// this will render the data in settings page, this needs to be changes if there is any change in index.html
function renderEntityFields(fieldsList, selectedFields) {

  var $fieldsListContainer = jQuery('#entity-fields-list');
  $fieldsListContainer.empty();


  Object.entries(fieldsList).forEach(function(fieldData, index){
    $fieldsListContainer.append('<li id="entity-field-'+index+'">'+
      '<div class="parent-field"><fw-checkbox '+ (isFieldChecked(selectedFields, fieldData) ? 'checked' : '')+'>'
      + fieldData[1] + '</fw-checkbox></div></li>');
    $fieldsListContainer.find('#entity-field-'+index+' fw-checkbox').data('value', fieldData);
  });
}

function isFieldChecked(fields, field) {
  if(fields && fields.length) {
    return fields.find(function(selectedField) { return selectedField[0] === field[0]; });
  } else {
    return defaultEnabledFields.includes(field[0]);
  }
}