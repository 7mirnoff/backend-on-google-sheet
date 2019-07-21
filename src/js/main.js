const axios = require('axios')

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
  });
}

const isGetData = new URLSearchParams()
isGetData.append(`isGet`, true)

const getData = () => {
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
