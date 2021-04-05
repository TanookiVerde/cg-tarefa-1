
/* ------------------------------------------------------------ */
/* ---Autor: Pedro Vitor Marques Nascimento-------------------- */
/* ---DRE: 116037448--Disciplina: Computação Gráfica 2020/2---- */
/* ------------------------------------------------------------ */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.BasicRenderer = {}));
}(this, (function (exports) { 'use strict';


/* ------------------------------------------------------------ */
       
    function inside( x, y, primitive) {
        // Descontinuada, pois cada classe de objeto implementa seu `is_point_inside(x,y)`
        return false
    }
    
    function Screen( width, height, scene ) {
        this.width = width;
        this.height = height;
        this.triangles = this.preprocess(scene);   
        this.createImage(); 
    }

    Object.assign( Screen.prototype, {

            preprocess: function(scene) {
                
                var triangulatedScene = [];
                for( var primitive of scene ) {  
                    var triangles = [];
                    
                    // Triangulação
                    if (primitive.shape == "circle"){
                        var circle = new Circle(primitive);
                        triangles = circle.triangulate()
                    } else if (primitive.shape == "triangle"){
                        triangles = [new Triangle(primitive.vertices, primitive.color)];
                    } else if (primitive.shape == "polygon"){
                        var polygon = new Polygon(primitive.vertices, primitive.color);
                        triangles = polygon.triangulate()
                    }

                    // Aplica transformações afins, caso exista
                    var hasTransformation = primitive.hasOwnProperty('xform');
                    if (hasTransformation){
                        var transformation = primitive.xform;
                        console.log(transformation);
                        for (var i = 0; i < triangles.length; i++){
                            triangles[i].apply_linear_transformation(transformation);
                        }
                        console.log(triangles);
                    }
                    
                    // Salva
                    for (var triangle of triangles){
                        triangulatedScene.push( triangle );
                    }
                }
                return triangulatedScene;
            },

            createImage: function() {
                this.image = nj.ones([this.height, this.width, 3]).multiply(255);
            },

            rasterize: function() {
                var color;
                
                //Para cada triângulo da scene
                for( var triangle of this.triangles ) {
                    var bounding_box = triangle.get_bounding_box();
                    
                    // Utiliza a bounding_box para um limite e um teto na horizontal
                    for (var i = bounding_box['x']['min']; i < bounding_box['x']['max']; i++) {
                        var x = i + 0.5;

                        // Utiliza a bounding_box para um limite e um teto na vertical
                        for( var j = bounding_box['y']['min']; j < bounding_box['y']['max']; j++) {
                            var y = j + 0.5;

                            // Pinta apenas se estiver dentro do triângulo
                            if ( triangle.is_point_inside(x, y) ) {
                                color = nj.array(triangle.color);
                                this.set_pixel( i, this.height - (j + 1), color );
                            }
                        }
                    }
                }
                
            },

            set_pixel: function( i, j, colorarr ) {
                this.image.set(j, i, 0,    colorarr.get(0));
                this.image.set(j, i, 1,    colorarr.get(1));
                this.image.set(j, i, 2,    colorarr.get(2));
            },

            update: function () {
                var $image = document.getElementById('raster_image');
                $image.width = this.width; $image.height = this.height;
                nj.images.save( this.image, $image );
            }
        }
    );

    exports.Screen = Screen;

    /* ------------------------------------------------------------ */
    /* ----------------FUNÇÕES E CLASSES AUXILIARES---------------- */
    /* ------------------------------------------------------------ */

    class Circle {
        constructor(primitive_dictionary){
            this.center_x = primitive_dictionary.center[0];
            this.center_y = primitive_dictionary.center[1];
            this.radius = primitive_dictionary.radius;
            this.color = primitive_dictionary.color;
        }
    
        triangulate(num_slices = 20){
            // Utiliza equação paramétrica para encontrar pontos na circunferência e cria
            // triângulos com eles.
            // num_slices = Número de pontos que vão aproximar a circunferência.

            var angle_per_slice = 2 * Math.PI / num_slices;
            
            var points = [];
            for (var i = 0; i < num_slices; i++){
                var theta = i * angle_per_slice;
                var x = this.radius * Math.cos(theta) + this.center_x;
                var y = this.radius * Math.sin(theta) + this.center_y;
                points.push([x,y])
            }
    
            var triangles = [];
            for (var i = 0; i < num_slices; i++){
                var center_point = [this.center_x, this.center_y];
                var current_point = points[i];
                var next_point = points[(i+1) % num_slices];
                triangles.push(new Triangle([center_point, current_point, next_point], this.color));
            }
            return triangles;
        }
    
        is_point_inside(x, y){
            // Utiliza equação implícita para definir se o ponto está dentro da circunferência

            return Math.pow(x-this.center_x, 2) + Math.pow(y-this.center_y, 2) <  Math.pow(this.radius, 2);
        }

        get_bounding_box(){
            // gera menor retângulo que encapsula a circunferência

            var result = {
                'x' : {
                    'min' : Math.round(this.center_x - this.radius),
                    'max' : Math.round(this.center_x + this.radius)
                },
                'y' : {
                    'min' : Math.round(this.center_y - this.radius),
                    'max' : Math.round(this.center_y + this.radius)
                }
            };
            return result;
        }
    }
    
    class Polygon {
        constructor(points, color){
            this.points = points;
            this.color = color;
        }
    
        triangulate(){
            // Utiliza Fan Triangulation para triangular poligono.

            return this.fan_triangulation(this.points);
        }

        fan_triangulation(points){
            // Escolhe um ponto com 'centro' e traça triângulos a partir dele.

            var center_point = points[0];
            var triangles = [];

            for (var i = 1; i < points.length-1; i++){
                var current_point = points[i];
                var next_point = points[(i+1) % points.length]
                triangles.push(new Triangle([center_point, current_point, next_point], this.color));
            }
            return triangles;
        }
    }
    
    class Triangle{
        constructor(points, color){
            this.points = points;
            this.color = color;
        }
    
        is_point_inside(x,y){
            // Determina se um ponto está dentro usando produto vetorial

            var success = 0;
    
            for(var i = 0; i < this.points.length; i++){
                var currentPoint = this.points[i];
                var nextPoint = this.points[(i+1) % this.points.length];
    
                var firstVector = [x-currentPoint[0], y-currentPoint[1]];
                var secondVector = [nextPoint[0]-currentPoint[0], nextPoint[1]-currentPoint[1]];
                var crossProduct = cross_product(firstVector, secondVector);

                if (crossProduct[2] > 0){
                    success++;
                }else{
                    success--;
                }
            }

            // Se todos estão apontando para o mesmo lado (ou todos positivos, ou todos negativos)
            return Math.abs(success) == this.points.length;
        }
        get_bounding_box(){
            // Gera menor retângulo que encapsula o triângulo

            var min_x = this.points[0][0]
            var min_y = this.points[0][1];
            var max_x = this.points[0][0];
            var max_y = this.points[0][1];
            for (var point of this.points){
                if (point[0] > max_x){
                    max_x = point[0]
                }else if (point[0] < min_x){
                    min_x = point[0]
                }
                if (point[1] > max_y){
                    max_y = point[1]
                }else if (point[1] < min_y){
                    min_y = point[1]
                }
            }
            var result = {
                'x' : {
                    'min' : Math.round(min_x),
                    'max' : Math.round(max_x)
                },
                'y' : {
                    'min' : Math.round(min_y),
                    'max' : Math.round(max_y)
                }
            };
            return result;
        }
        apply_linear_transformation(transformation){
            // Aplica transformação linear nos vértices do retângulo

            for (var i = 0; i < this.points.length; i++){
                this.points[i] = transform_point(this.points[i], transformation);
            }
        }
    }
    
    function cross_product(firstVector, secondVector){
        // Faz produto vetorial de dois vetores 2D

        return [
            firstVector[1] * secondVector[2] - firstVector[2] * secondVector[1],
            firstVector[2] * secondVector[0] - firstVector[0] * secondVector[2],
            firstVector[0] * secondVector[1] - firstVector[1] * secondVector[0]
        ];
    }

    function transform_point(point, transformation){
        // Faz produto de matriz do ponto e da transformação

        var point_vector = [point[0], point[1], 0];
        return [
            point_vector[0]*transformation[0][0] + point_vector[1]*transformation[0][1] + point_vector[2]*transformation[0][2],
            point_vector[0]*transformation[1][0] + point_vector[1]*transformation[1][1] + point_vector[2]*transformation[1][2]
        ];
    }
    
})));

