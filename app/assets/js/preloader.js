const {ipcRenderer} = require('electron')
const fs            = require('fs-extra')
const os            = require('os')
const path          = require('path')

const ConfigManager = require('./configmanager')
const DistroManager = require('./distromanager')
const LangLoader    = require('./langloader')
const logger        = require('./loggerutil')('%c[Preloader]', 'color: #a02d2a; font-weight: bold')

logger.log('Loading..')

// Load ConfigManager
ConfigManager.load()

// Load Strings
LangLoader.loadLanguage('ko_KR')

function onDistroLoad(data){
    if(data != null){
        
        // Resolve the selected server if its value has yet to be set.
        if(ConfigManager.getSelectedServer() == null || data.getServer(ConfigManager.getSelectedServer()) == null){
            logger.log('Determining default selected server..')
            ConfigManager.setSelectedServer(data.getMainServer().getID())
            ConfigManager.save()
        }
    }
    ipcRenderer.send('distributionIndexDone', data != null)
}

// Ensure Distribution is downloaded and cached.
DistroManager.pullRemote().then((data) => {
    logger.log('배포 인덱스 로드 완료 ')

    onDistroLoad(data)

}).catch((err) => {
    logger.log('배포 인덱스를 불러오는 중....')
    logger.error(err)

    logger.log('이전버전 배포 인덱스를 불러오는중입니다.')
    // Try getting a local copy, better than nothing.
    DistroManager.pullLocal().then((data) => {
        logger.log('이전버전의 배포 인덱스를 불러오는데 성공했습니다.')

        onDistroLoad(data)


    }).catch((err) => {

        logger.log('이전버전의 배포 인덱스를 불러오지 못했습니다.')
        logger.log('런처를 시작할수 없습니다.')
        logger.error('발생 오류 : '+err)

        onDistroLoad(null)

    })

})

// Clean up temp dir incase previous launches ended unexpectedly. 
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Error while cleaning natives directory', err)
    } else {
        logger.log('Cleaned natives directory.')
    }
})