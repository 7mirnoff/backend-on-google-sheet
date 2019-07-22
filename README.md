# Бекенд на Google таблицах для фронтендера

Небольшая статья, как сделать хранилище для ваших данных с помощью Google таблиц. Сразу оговорюсь, у всего есть ограничения: на данный момент суточный лимит - [50 000 запросов чтения/записи](https://developers.google.com/apps-script/guides/services/quotas). В статье я рассмотрю способ чтения и записи данных c помощью Google Spreadsheets API используя ajax запросы.

Обращаю внимание, что быстродействие оставляет желать лучшего. Ну сами понимаете - внешнее API. Но для создания,например, формы обратной связи на личном сайте пойдет. Тем более если вы начинающий фронтендер и не знаете PHP, а поиграться с динамическими данными хочется.

В статье не ждите идеального кода и осмысленного интерфейса, я просто хочу показать вариант хранения динамического контента, а как применить это на практике решать Вам.

Возьму утрированый пример: форму для комментариев. Выглядеть она будет так:

![alt-текст](https://raw.githubusercontent.com/7mirnoff/backend-on-google-sheet/master/material/interface.png "Интерфейс")
> _Интерфейс включает в себя форму для сообщений и список выведенных комментариев из таблицы_

## Создадем таблицу на Google Doc
[Открыть Google Таблицы](https://www.google.ru/intl/ru/sheets/about/)

В моем примере мне потребуются столбцы:
1. Timestamp - для времени записи сообщения(если это поле существует - скрипт Google таблиц будет заполнять его автоматически в момент записи полученных данных)
2. name - для поля имени пользователя
3. message - для поля сообщения

Я сразу меняю имя листа у таблицы на латинские символы, например "Sheet1" - его необходимо будет указать в скрипте

![alt-текст](https://raw.githubusercontent.com/7mirnoff/backend-on-google-sheet/master/material/cleartable.png "Пустая таблица")

## Добавляем скрипт(.gs) для обработки наших ajax запросов

**Инструменты - Редактор скриптов**

![alt-текст](https://raw.githubusercontent.com/7mirnoff/backend-on-google-sheet/master/material/tools.png "Меню - редактор скриптов")

Скрипт для вставки:

```javascript
var ss = SpreadsheetApp.getActiveSpreadsheet(),
      s = ss.getActiveSheet();

function getData(){
  var result = [],
      range = 'A:C', // диапазон ячеек, который хотим выгружать
      values = s.getRange(range).getValues(),
      last_row = parseInt(s.getLastRow());

  for (var i = 1; i < last_row; i++) {
      result.push(values[i]);
  }
  return result;
}

function doGet(e){
  if (!e.parameter.isGet) {
    return handleResponse(e);
  } else {
    var data = getData();
    if(!data) {
      data = '';
    }
    return ContentService.createTextOutput(JSON.stringify({'result': data})).setMimeType(ContentService.MimeType.JSON);
  }

}
var SHEET_NAME = "Sheet1"; // имя таблицы в которую записываем данные из формы

var SCRIPT_PROP = PropertiesService.getScriptProperties();

function handleResponse(e) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);

  try {
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);

    var headRow = e.parameter.header_row || 1;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;
    var row = [];

    for (i in headers){
      if (headers[i] == "Timestamp"){
        row.push(new Date());
      } else {
        row.push(e.parameter[headers[i]]);
      }
    }

    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);

    return ContentService
    .createTextOutput(JSON.stringify({"result":"success", "row": nextRow, "eparameter": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(e){

    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}
```
> _Комментариями отмечены места которые требуют вашего внимания: при необходимости переопределите диапазон ячеек, данные которых будут отправлены на клиент_

> _Не забудте указать SHEET_NAME, оно указывается скрипту в какой лист записывать отправленные клиентом данные_

Данные скрипт я собрал из двух статей:

[Данные из Google Таблиц на вашем сайте](https://habr.com/ru/company/englishdom/blog/343082/)

[Google Sheets as a Database – INSERT with Apps Script using POST/GET methods (with ajax example)](https://mashe.hawksey.info/2014/07/google-sheets-as-a-database-insert-with-apps-script-using-postget-methods-with-ajax-example/)

Там также есть оригинальные комментарии к коду, если хотите доработать или дополнить функционал.

Ссылки на документацию Google:

[Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet/)

[Class Sheet](https://developers.google.com/apps-script/reference/spreadsheet/sheet)


TODO: дописать настройку скрипта

## Клиентский JS

Для ajax запросов я использую [Axios](https://github.com/axios/axios).

```javascript
const buttonSubmit = document.querySelector(`.form__button`)
let messageList = document.querySelector(`.messages`)

const ajaxRequest = (params, cb) => {
  axios({
    method: 'GET',
    url: 'https://script.google.com/macros/s/AKfycbytnJIztgXLbdjeNe7rwd5ZTf70PeNMb-SD4uCzyFqKu7YkE_mY/exec',
    params: params
  }).then((res) => {
    cb(res)
  }).catch((err) => {
    console.log('AXIOS ERROR: ', err)
  })
}

const renderData = (res) => {
  const data = res.data.result
  const renderData = ``
  messageList.innerHTML = ``
  data.forEach(post => {
    messageList.innerHTML = `${messageList.innerHTML}
                            <li class="messages__item">
                              <span class="message__item-time">${post[0]}</span>
                              <h3 class="messages__item-name">${post[1]}</h3>
                              <p class="messages__item-message">${post[2]}</p>
                            </li>`
  })
}

const isGetData = new URLSearchParams()
isGetData.append(`isGet`, true)

const getData = () => { // функция для получения данных из таблицы
  ajaxRequest(isGetData, renderData)
}

getData()

buttonSubmit.addEventListener(`click`, (evt) => {
  evt.preventDefault()
  const feeld = document.querySelectorAll(`.form__field`)
  const formData = new URLSearchParams()

  for (let i = 0; i < feeld.length; i++) {
    formData[feeld[i].name] = feeld[i].value
    formData.delete(feeld[i].name, feeld[i].value)
    formData.append(feeld[i].name, feeld[i].value)
  }

  ajaxRequest(formData, getData)
})
```
