<?php
    namespace MomentApp\FileMan;
    use MomentCore\HttpHandle;

    use function MomentAdaper\copy;
    use function MomentAdaper\header;
    use function MomentAdaper\http_response_code;
    use function MomentAdaper\move;
    use function MomentCore\__main;

    if(!defined('__MAIN__')){
        define('__MAIN__',__FILE__);
        include_once "./moment.php";
        HttpHandle::$alias['/@fs_api/'] = ':' . __FILE__;
        __main();
    }

    if(!function_exists('getBaseName')){

        function stat(string $path,string $fname){
            $data = @\stat($path);
            if($data){
                return [
                    'type' => is_dir($path) ? 'dir' : 'file',
                    'name' => $fname,
                    'ctime' => $data['ctime'],
                    'access' => $data['mode'],
                    'size' => $data['size']
                ];
            }else{
                return [
                    'type' => is_dir($path) ? 'dir' : 'file',
                    'name' => $fname,
                    'ctime' => 0,
                    'access' => 0,
                    'size' => $data['size']
                ];
            }
        }

        function delDir($path) {
            if (is_dir($path)) {
                $dirs = scandir($path);
                foreach ($dirs as $dir) {
                    if ($dir != '.' && $dir != '..') {
                        $child = $path.'/'.$dir;
                        if (is_dir($child)) {
                            delDir($child);
                            @rmdir($child);
                        } else {
                            @unlink($child);
                        }
                    }
                }
                @rmdir($path);
            }
        }
    }

    return function(HttpHandle $h){
        $APP_ROOT = __CONFIG__['rounger']['root'];

        if($h -> client -> method == 'OPTIONS') return;

        $mode = $_GET['mode'];
        switch ($mode) {
            case 'list':
                $dir = @opendir($prefix = $APP_ROOT . $_GET['path']);
                if($dir === false)
                    return header("status: 403");
                $arr = [];
                while(false !== ($f = readdir($dir))){
                    if(str_starts_with($f,'.')) continue;
                    $arr[] = stat("$prefix/$f",$f);
                }
                echo json_encode($arr);
            break;

            case 'stat':
                $stat = \stat($APP_ROOT . $_GET['path'],basename($APP_ROOT . $_GET['path']));
                if($stat === false){
                    echo error_get_last()['message'];
                    return http_response_code(403);
                }
                echo json_encode($stat);
            break;

            case 'copy':
                // echo -count(copy($APP_ROOT . $_GET['from'],$APP_ROOT . $_GET['to']));
                echo \copy($APP_ROOT . $_GET['from'],$APP_ROOT . $_GET['to']);
            break;

            case 'move':
                // echo -count(move($APP_ROOT . $_GET['from'],$APP_ROOT . $_GET['to']));
                echo \rename($APP_ROOT . $_GET['from'],$APP_ROOT . $_GET['to']);
            break;

            case 'mkdir':
                echo mkdir($APP_ROOT . $_GET['path']);
            break;

            case 'touch':
                echo touch($APP_ROOT . $_GET['path']);
            break;

            case 'delete':
                if(
                    (is_dir($APP_ROOT . $_GET['path']) && delDir($APP_ROOT . $_GET['path'])) ||
                    (is_file($APP_ROOT . $_GET['path']) && unlink($APP_ROOT . $_GET['path']))
                ){
                    echo 0;
                }else{
                    echo error_get_last()['message'];
                    return http_response_code(403);
                }
            break;

            case 'post_delete':
                foreach ($_POST as $item)
                    if(
                        (is_dir($APP_ROOT . $item) && delDir($APP_ROOT . $item)) ||
                        (is_file($APP_ROOT . $item) && unlink($APP_ROOT . $item))
                    ){
                        echo 0;
                    }else{
                        echo $item . ': ' . error_get_last()['message'];
                        return http_response_code(403);
                    }
            break;

            case 'post_copy':
                $error = [];
                foreach ($_POST as $item)
                    array_push($error,...copy($APP_ROOT . $item,$APP_ROOT . $_GET['to']));
                if(count($error) > 0){
                    echo json_encode($error);
                    return http_response_code(403);
                }
            break;

            case 'post_move':
                $error = [];
                foreach ($_POST as $item)
                    array_push($error,...move($APP_ROOT . $item,$APP_ROOT . $_GET['to']));
                if(count($error) > 0){
                    echo json_encode($error);
                    return http_response_code(403);
                }
            break;
            
            default:
                http_response_code(404);
                echo 'unknown mode';
            break;
        }
    }
?>